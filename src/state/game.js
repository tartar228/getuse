import { START_COINS, sellValue, scrapValue } from '../game/economy.js';
import { TIERS } from '../game/value.js';
import { hydrate, toRaw } from '../game/appraise.js';
import { FREE_CAP, START_SPINS, refill, buyPrice, recentBuys } from '../game/spins.js';
import { dayKey, touchVisit, bonusAvailable, rewardForStreak } from '../game/daily.js';
import { emptyDaily, rollTasks, findDef, isClaimable } from '../game/tasks.js';
import { advanceMarket, marketInfo } from '../game/market.js';

// Всё состояние игры. Сохраняется целиком (см. persist.js).
// collection и pending хранят «сырые» юзы {id, name, platform, ts}.
export const initialState = () => ({
  coins: START_COINS,
  spins: START_SPINS,
  spinsAt: 0, // с какого момента копится следующая бесплатная крутка (0 — ещё не стартовало)
  buyCount: 0, // сколько круток куплено недавно (для роста цены)
  buyAt: 0,
  collection: [],
  pending: null, // выпавший юз, по которому ещё не принято решение
  lifetime: { spins: 0, tiers: TIERS.map(() => 0), marketSales: 0 },
  daily: { visitDay: '', streak: 0, bonusDay: '' },
  tasks: emptyDaily(),
  claimed: {}, // полученные награды постоянных заданий и достижений
  market: null, // состояние биржи, создаётся при первом заходе (см. game/market.js)
  savedAt: 0,
});

// Подмешиваем сохранённое в дефолт, чтобы новые поля не ломали старые сохранения
export function normalize(saved) {
  const base = initialState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    lifetime: {
      spins: saved.lifetime?.spins ?? 0,
      tiers: TIERS.map((_, i) => saved.lifetime?.tiers?.[i] ?? 0),
      marketSales: saved.lifetime?.marketSales ?? 0,
    },
    daily: { ...base.daily, ...saved.daily },
    tasks: { ...base.tasks, ...saved.tasks, claimed: { ...saved.tasks?.claimed } },
    claimed: { ...saved.claimed },
    market: saved.market && saved.market.trends && saved.market.lots ? saved.market : null,
    collection: Array.isArray(saved.collection) ? saved.collection.filter((c) => c.platform) : [],
  };
}

// Всё, что зависит от времени: накопление круток, смена дня, стрик.
// Возвращает тот же объект, если ничего не изменилось.
export function advance(state, now) {
  return advanceMarket(touchVisit(rollTasks(refill(state, now), now), now), now);
}

function applyReward(state, r) {
  return { ...state, coins: state.coins + (r.coins || 0), spins: state.spins + (r.spins || 0) };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return advance(normalize(action.state), action.now);

    // раз в секунду: докручиваем таймер, следим за сменой дня
    case 'tick':
      return advance(state, action.now);

    case 'spin': {
      const s = advance(state, action.now);
      if (s.pending || s.spins <= 0) return s;
      const d = action.drop;
      return {
        ...s,
        spins: s.spins - 1,
        // если запас был полон, таймер следующей крутки стартует с этого момента
        spinsAt: s.spins >= FREE_CAP ? action.now : s.spinsAt,
        pending: toRaw(d),
        lifetime: {
          ...s.lifetime,
          spins: s.lifetime.spins + 1,
          tiers: s.lifetime.tiers.map((n, i) => (i === d.tier ? n + 1 : n)),
        },
        tasks: {
          ...s.tasks,
          spins: s.tasks.spins + 1,
          platforms: s.tasks.platforms.includes(d.platform) ? s.tasks.platforms : [...s.tasks.platforms, d.platform],
        },
      };
    }

    case 'decide': {
      if (!state.pending) return state;
      const d = hydrate(state.pending);
      const next = { ...state, pending: null };
      if (action.kind === 'keep') next.collection = [state.pending, ...state.collection];
      if (action.kind === 'sell') next.coins = state.coins + sellValue(d);
      if (action.kind === 'scrap') next.coins = state.coins + scrapValue(d);
      return next;
    }

    // продажа / разбор юза прямо из коллекции
    case 'sellItem':
    case 'scrapItem': {
      const item = state.collection.find((c) => c.id === action.id);
      if (!item) return state;
      const d = hydrate(item);
      const gain = action.type === 'sellItem' ? sellValue(d) : scrapValue(d);
      return {
        ...state,
        coins: state.coins + gain,
        collection: state.collection.filter((c) => c.id !== action.id),
      };
    }

    case 'buySpins': {
      const s = advance(state, action.now);
      const price = buyPrice(s, action.now, action.count);
      if (s.coins < price) return s;
      return {
        ...s,
        coins: s.coins - price,
        spins: s.spins + action.count,
        buyCount: recentBuys(s, action.now) + action.count,
        buyAt: action.now,
      };
    }

    case 'claimDaily': {
      const s = advance(state, action.now);
      if (!bonusAvailable(s, action.now)) return s;
      const r = rewardForStreak(s.daily.streak);
      return applyReward({ ...s, daily: { ...s.daily, bonusDay: dayKey(action.now) } }, r);
    }

    // награда за задание или достижение
    case 'claim': {
      const s = advance(state, action.now);
      const def = findDef(action.id);
      if (!def) return s;
      const items = s.collection.map(hydrate);
      if (!isClaimable(def, s, items)) return s;
      const next = applyReward(s, def.reward);
      return action.id.startsWith('d_')
        ? { ...next, tasks: { ...next.tasks, claimed: { ...next.tasks.claimed, [action.id]: true } } }
        : { ...next, claimed: { ...next.claimed, [action.id]: true } };
    }

    // ---------- биржа ----------

    // выставить юз из коллекции на биржу по своей цене
    case 'listItem': {
      const s = advance(state, action.now);
      const item = s.collection.find((c) => c.id === action.id);
      const ask = Math.round(action.ask);
      if (!item || !s.market || !(ask >= 1)) return s;
      const d = hydrate(item);
      const info = marketInfo(d);
      const listing = {
        id: d.id,
        name: d.name,
        platform: d.platform,
        tier: d.tier,
        base: d.price,
        cat: info.cat || undefined,
        ask: Math.min(ask, 1e9),
        ts: item.ts,
        at: action.now,
      };
      return {
        ...s,
        collection: s.collection.filter((c) => c.id !== action.id),
        market: { ...s.market, listings: [listing, ...s.market.listings] },
      };
    }

    // снять свой лот, юз возвращается в коллекцию
    case 'unlist': {
      const l = state.market?.listings.find((x) => x.id === action.id);
      if (!l) return state;
      return {
        ...state,
        collection: [{ id: l.id, name: l.name, platform: l.platform, ts: l.ts }, ...state.collection],
        market: { ...state.market, listings: state.market.listings.filter((x) => x.id !== action.id) },
      };
    }

    // купить лот NPC-продавца
    case 'buyLot': {
      const s = advance(state, action.now);
      const lot = s.market?.lots.find((l) => l.id === action.id);
      if (!lot || s.coins < lot.ask) return s;
      return {
        ...s,
        coins: s.coins - lot.ask,
        collection: [{ id: lot.id, name: lot.name, platform: lot.platform, ts: action.now }, ...s.collection],
        market: { ...s.market, lots: s.market.lots.filter((l) => l.id !== lot.id) },
      };
    }

    case 'acceptOffer': {
      const s = advance(state, action.now);
      const o = s.market?.offers.find((x) => x.id === action.id);
      if (!o || !s.collection.some((c) => c.id === o.itemId)) return s;
      const sat = { ...s.market.sat, [o.platform]: Math.min(0.4, (s.market.sat[o.platform] || 0) + 0.03) };
      return {
        ...s,
        coins: s.coins + o.price,
        collection: s.collection.filter((c) => c.id !== o.itemId),
        lifetime: { ...s.lifetime, marketSales: s.lifetime.marketSales + 1 },
        tasks: { ...s.tasks, marketSales: s.tasks.marketSales + 1 },
        market: {
          ...s.market,
          sat,
          offers: s.market.offers.filter((x) => x.itemId !== o.itemId),
        },
      };
    }

    case 'declineOffer':
      if (!state.market) return state;
      return { ...state, market: { ...state.market, offers: state.market.offers.filter((x) => x.id !== action.id) } };

    case 'dismissSummary':
      if (!state.market?.summary) return state;
      return { ...state, market: { ...state.market, summary: null } };

    default:
      return state;
  }
}
