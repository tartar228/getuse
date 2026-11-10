import { hydrate } from './appraise.js';

// Талисман: юз из коллекции, закреплённый за своей редкостью. По одному на каждую редкость,
// чем выше редкость, тем больше удачи. Удача ×L значит, что крутка берёт лучший из нескольких
// вариантов: L = 1.3 — в 30% круток выбирается лучший из двух, L = 2.2 — всегда из двух, в 20% из трёх.
export const LUCK_BONUS = [0.03, 0.06, 0.12, 0.22, 0.4, 0.8];

// Рабочие талисманы: юз ещё в коллекции и его редкость совпадает с ячейкой
export function activeTalismans(state) {
  const out = {};
  for (const [tier, id] of Object.entries(state.talismans || {})) {
    const item = state.collection.find((c) => c.id === id);
    if (item && hydrate(item).tier === Number(tier)) out[tier] = id;
  }
  return out;
}

export function luckOf(state) {
  const act = activeTalismans(state);
  const bonus = Object.keys(act).reduce((s, t) => s + LUCK_BONUS[t], 0);
  return Math.round((1 + bonus) * 100) / 100;
}

export const isTalisman = (state, id) => Object.values(state.talismans || {}).includes(id);

// убрать юз из талисманов (когда его продают, разбирают или выставляют)
export function withoutTalisman(state, id) {
  if (!isTalisman(state, id)) return state;
  const talismans = {};
  for (const [t, v] of Object.entries(state.talismans)) if (v !== id) talismans[t] = v;
  return { ...state, talismans };
}
