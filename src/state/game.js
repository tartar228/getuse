import { START_COINS, sellValue, scrapValue } from '../game/economy.js';
import { TIERS } from '../game/value.js';
import { hydrate, toRaw } from '../game/appraise.js';

// Всё состояние игры. Сохраняется целиком (см. persist.js).
// collection и pending хранят «сырые» юзы {id, name, platform, ts}.
export const initialState = () => ({
  coins: START_COINS,
  collection: [],
  pending: null, // выпавший юз, по которому ещё не принято решение
  lifetime: { spins: 0, tiers: TIERS.map(() => 0) },
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
    },
    collection: Array.isArray(saved.collection) ? saved.collection.filter((c) => c.platform) : [],
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return normalize(action.state);

    case 'spin': {
      const d = action.drop;
      return {
        ...state,
        pending: toRaw(d),
        lifetime: {
          spins: state.lifetime.spins + 1,
          tiers: state.lifetime.tiers.map((n, i) => (i === d.tier ? n + 1 : n)),
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

    default:
      return state;
  }
}
