import { START_COINS, sellValue, scrapValue } from '../game/economy.js';
import { TIERS } from '../game/value.js';
import { hydrate, toRaw } from '../game/appraise.js';
import { START_SPINS, refill, buyPrice, recentBuys, capOf } from '../game/spins.js';
import { dayKey, touchVisit, bonusAvailable, rewardForStreak } from '../game/daily.js';
import { emptyDaily, rollTasks, findDef, isClaimable } from '../game/tasks.js';
import { advanceMarket, marketInfo, normalizeMarket } from '../game/market.js';
import {
  BASE_SLOTS,
  MAX_BATCH,
  SLOT_PACK,
  XP_BY_TIER,
  XP_CLAIM,
  XP_DAILY,
  XP_MARKET_SALE,
  levelOf,
  levelReward,
  slotPrice,
  slotsAt,
} from '../game/levels.js';
import { withoutTalisman } from '../game/talismans.js';

// Всё состояние игры. Сохраняется целиком (см. persist.js).
// collection и pending хранят «сырые» юзы {id, name, platform, ts, no}.
export const initialState = () => ({
  coins: START_COINS,
  spins: START_SPINS,
  spinsAt: 0, // с какого момента копится следующая бесплатная крутка (0 — ещё не стартовало)
  buyCount: 0, // сколько круток куплено недавно (для роста цены)
  buyAt: 0,
  collection: [],
  pending: null, // выпавшие юзы (до 5 за раз), по которым ещё не принято решение
  lifetime: { spins: 0, tiers: TIERS.map(() => 0), marketSales: 0 },
  daily: { visitDay: '', streak: 0, bonusDay: '' },
  tasks: emptyDaily(),
  claimed: {}, // полученные награды постоянных заданий и достижений
  xp: 0, // опыт; уровень считается из него (game/levels.js)
  levelClaimed: 1, // до какого уровня уже выданы награды
  slotsBought: 0, // сколько пар мест куплено
  talismans: {}, // { тир: id юза } — по одному талисману на редкость
  market: null, // состояние биржи, создаётся при первом заходе (см. game/market.js)
  savedAt: 0,
});

// Места в коллекции: базовые + за уровни + купленные
export const capacity = (s) => BASE_SLOTS + slotsAt(levelOf(s.xp).level) + SLOT_PACK * (s.slotsBought || 0);
export const freeSlots = (s) => Math.max(0, capacity(s) - s.collection.length);

// В старых сохранениях pending был одним юзом, теперь это список
function normalizePending(p) {
  const list = (Array.isArray(p) ? p : p ? [p] : []).filter((x) => x && x.id && x.name && x.platform);
  return list.length ? list.slice(0, MAX_BATCH) : null;
}

// Подмешиваем сохранённое в дефолт, чтобы новые поля не ломали старые сохранения
export function normalize(saved, now = Date.now()) {
  const base = initialState();
  if (!saved) return base;
  const xp = Math.max(0, Number(saved.xp) || 0);
  const collection = Array.isArray(saved.collection) ? saved.collection.filter((c) => c.platform) : [];
  // старое сохранение (до слотов): места выдаём под всю накопленную коллекцию и ещё 4 сверху
  const grandfathered = Math.max(0, Math.ceil((collection.length + 4 - BASE_SLOTS) / SLOT_PACK));
  return {
    ...base,
    ...saved,
    // часы телефона могли уйти назад: отметки времени из будущего не копим
    spinsAt: Math.min(saved.spinsAt || 0, now),
    buyAt: Math.min(saved.buyAt || 0, now),
    lifetime: {
      spins: saved.lifetime?.spins ?? 0,
      tiers: TIERS.map((_, i) => saved.lifetime?.tiers?.[i] ?? 0),
      marketSales: saved.lifetime?.marketSales ?? 0,
    },
    daily: { ...base.daily, ...saved.daily },
    tasks: { ...base.tasks, ...saved.tasks, claimed: { ...saved.tasks?.claimed } },
    claimed: { ...saved.claimed },
    market: normalizeMarket(saved.market, now),
    collection,
    pending: normalizePending(saved.pending),
    xp,
    levelClaimed: Math.max(1, Number(saved.levelClaimed) || levelOf(xp).level),
    slotsBought: saved.slotsBought === undefined ? grandfathered : Math.max(0, Math.floor(Number(saved.slotsBought) || 0)),
    talismans: saved.talismans && typeof saved.talismans === 'object' ? { ...saved.talismans } : {},
  };
}

// Всё, что зависит от времени: накопление круток, смена дня, стрик.
// Возвращает тот же объект, если ничего не изменилось.
export function advance(state, now) {
  return advanceMarket(touchVisit(rollTasks(refill(state, now), now), now), now);
}

// Офферы на юз, которого больше нет в коллекции, сразу убираем: иначе «Принять» будет мёртвой кнопкой
const withoutOffers = (market, itemId) =>
  (market ? { ...market, offers: market.offers.filter((o) => o.itemId !== itemId) } : market);

function applyReward(state, r) {
  return { ...state, coins: state.coins + (r.coins || 0), spins: state.spins + (r.spins || 0) };
}

// Начисляем опыт и сразу выдаём награды за новые уровни
function addXp(state, amount) {
  const s = { ...state, xp: state.xp + amount };
  const { level } = levelOf(s.xp);
  if (level <= s.levelClaimed) return s;
  let out = s;
  for (let l = s.levelClaimed + 1; l <= level; l++) out = applyReward(out, levelReward(l));
  return { ...out, levelClaimed: level };
}

// Юз покидает коллекцию (продажа, разбор, биржа): убираем его из талисманов и снимаем офферы
const removeItem = (s, id) => {
  const t = withoutTalisman(s, id);
  return { ...t, collection: t.collection.filter((c) => c.id !== id), market: withoutOffers(t.market, id) };
};

export function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return advance(normalize(action.state, action.now), action.now);

    // раз в секунду: докручиваем таймер, следим за сменой дня
    case 'tick':
      return advance(state, action.now);

    // крутка на 1–5 попыток сразу: action.drops — уже выпавшие юзы
    case 'spin': {
      const s = advance(state, action.now);
      const drops = action.drops || [];
      const n = drops.length;
      if (s.pending || n < 1 || n > MAX_BATCH || s.spins < n) return s;
      const tiers = [...s.lifetime.tiers];
      const platforms = [...s.tasks.platforms];
      let xp = 0;
      for (const d of drops) {
        tiers[d.tier]++;
        xp += XP_BY_TIER[d.tier];
        if (!platforms.includes(d.platform)) platforms.push(d.platform);
      }
      return addXp(
        {
          ...s,
          spins: s.spins - n,
          // если запас был полон, таймер следующей крутки стартует с этого момента
          spinsAt: s.spins >= capOf(s) ? action.now : s.spinsAt,
          pending: drops.map((d, i) => toRaw({ ...d, no: s.lifetime.spins + i + 1 })),
          lifetime: { ...s.lifetime, spins: s.lifetime.spins + n, tiers },
          tasks: { ...s.tasks, spins: s.tasks.spins + n, platforms },
        },
        xp,
      );
    }

    // решение по одному из выпавших юзов
    case 'decide': {
      const raw = state.pending?.find((p) => p.id === action.id);
      if (!raw) return state;
      const d = hydrate(raw);
      const next = { ...state };
      if (action.kind === 'keep') {
        if (freeSlots(state) <= 0) return state;
        next.collection = [raw, ...state.collection];
      }
      if (action.kind === 'sell') next.coins = state.coins + sellValue(d);
      if (action.kind === 'scrap') next.coins = state.coins + scrapValue(d);
      const rest = state.pending.filter((p) => p.id !== raw.id);
      next.pending = rest.length ? rest : null;
      return next;
    }

    // продать или разобрать всё, что ещё не решено
    case 'decideAll': {
      if (!state.pending || (action.kind !== 'sell' && action.kind !== 'scrap')) return state;
      const value = action.kind === 'sell' ? sellValue : scrapValue;
      const gain = state.pending.reduce((sum, raw) => sum + value(hydrate(raw)), 0);
      return { ...state, coins: state.coins + gain, pending: null };
    }

    // продажа / разбор юза прямо из коллекции
    case 'sellItem':
    case 'scrapItem': {
      const item = state.collection.find((c) => c.id === action.id);
      if (!item) return state;
      const d = hydrate(item);
      const gain = action.type === 'sellItem' ? sellValue(d) : scrapValue(d);
      return { ...removeItem(state, action.id), coins: state.coins + gain };
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

    // купить пару мест в коллекции
    case 'buySlots': {
      const price = slotPrice(state.slotsBought);
      if (state.coins < price) return state;
      return { ...state, coins: state.coins - price, slotsBought: state.slotsBought + 1 };
    }

    // назначить талисман: юз из коллекции встаёт в ячейку своей редкости
    case 'setTalisman': {
      const item = state.collection.find((c) => c.id === action.id);
      if (!item) return state;
      return { ...state, talismans: { ...withoutTalisman(state, item.id).talismans, [hydrate(item).tier]: item.id } };
    }

    case 'clearTalisman':
      return withoutTalisman(state, action.id);

    case 'claimDaily': {
      const s = advance(state, action.now);
      if (!bonusAvailable(s, action.now)) return s;
      const r = rewardForStreak(s.daily.streak);
      return addXp(applyReward({ ...s, daily: { ...s.daily, bonusDay: dayKey(action.now) } }, r), XP_DAILY);
    }

    // награда за задание или достижение
    case 'claim': {
      const s = advance(state, action.now);
      const def = findDef(action.id);
      if (!def) return s;
      const items = s.collection.map(hydrate);
      if (!isClaimable(def, s, items)) return s;
      const next = applyReward(s, def.reward);
      const marked = action.id.startsWith('d_')
        ? { ...next, tasks: { ...next.tasks, claimed: { ...next.tasks.claimed, [action.id]: true } } }
        : { ...next, claimed: { ...next.claimed, [action.id]: true } };
      return addXp(marked, XP_CLAIM);
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
      const t = removeItem(s, d.id);
      return { ...t, market: { ...t.market, listings: [listing, ...t.market.listings] } };
    }

    // снять свой лот, юз возвращается в коллекцию (если есть место)
    case 'unlist': {
      const l = state.market?.listings.find((x) => x.id === action.id);
      if (!l || freeSlots(state) <= 0) return state;
      return {
        ...state,
        collection: [{ id: l.id, name: l.name, platform: l.platform, ts: l.ts }, ...state.collection],
        market: { ...state.market, listings: state.market.listings.filter((x) => x.id !== action.id) },
      };
    }

    // купить лот NPC-продавца (нужно свободное место)
    case 'buyLot': {
      const s = advance(state, action.now);
      const lot = s.market?.lots.find((l) => l.id === action.id);
      if (!lot || s.coins < lot.ask || freeSlots(s) <= 0) return s;
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
      const t = removeItem(s, o.itemId);
      return addXp(
        {
          ...t,
          coins: t.coins + o.price,
          lifetime: { ...t.lifetime, marketSales: t.lifetime.marketSales + 1 },
          tasks: { ...t.tasks, marketSales: t.tasks.marketSales + 1 },
          market: { ...t.market, sat },
        },
        XP_MARKET_SALE,
      );
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
