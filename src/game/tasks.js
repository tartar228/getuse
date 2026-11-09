import { PLATFORM_ORDER } from './platforms.js';
import { dayKey } from './daily.js';

// Задания и достижения. Прогресс постоянных заданий и достижений не хранится —
// он считается из состояния (коллекция, статистика, стрик), в сохранении лежат
// только отметки «награда получена» (state.claimed).
// Прогресс ежедневных заданий копится в state.tasks и сбрасывается каждый день.

export const emptyDaily = (day = '') => ({
  day,
  spins: 0,
  platforms: [],
  marketSales: 0,
  claimed: {},
});

// Сброс ежедневных заданий при смене дня
export function rollTasks(state, now) {
  const day = dayKey(now);
  return state.tasks.day === day ? state : { ...state, tasks: emptyDaily(day) };
}

// items — юзы коллекции с тирами (hydrate)
const countTier = (items, minTier) => items.filter((d) => d.tier >= minTier).length;
const platformsOwned = (items) => new Set(items.map((d) => d.platform)).size;

export const DAILY_TASKS = [
  { id: 'd_spin10', title: 'Крутни 10 раз', target: 10, get: (s) => s.tasks.spins, reward: { coins: 50, spins: 2 } },
  { id: 'd_market1', title: 'Продай юз на бирже', target: 1, get: (s) => s.tasks.marketSales, reward: { coins: 100 } },
  {
    id: 'd_platforms',
    title: 'Выбей юз для каждой платформы',
    target: PLATFORM_ORDER.length,
    get: (s) => s.tasks.platforms.length,
    reward: { coins: 100, spins: 3 },
  },
  { id: 'd_spin30', title: 'Крутни 30 раз', target: 30, get: (s) => s.tasks.spins, reward: { coins: 150, spins: 3 } },
];

export const PERM_TASKS = [
  { id: 'p_streak3', title: 'Заходи 3 дня подряд', target: 3, get: (s) => s.daily.streak, reward: { coins: 150, spins: 5 } },
  { id: 'p_epic3', title: 'Собери 3 эпика', target: 3, get: (s, it) => countTier(it, 3), reward: { coins: 300, spins: 3 } },
  { id: 'p_rare5', title: 'Собери 5 редких', target: 5, get: (s, it) => countTier(it, 2), reward: { coins: 200 } },
  { id: 'p_each', title: 'Собери юз каждой платформы', target: PLATFORM_ORDER.length, get: (s, it) => platformsOwned(it), reward: { coins: 400 } },
  { id: 'p_legend', title: 'Собери легендарку', target: 1, get: (s, it) => countTier(it, 4), reward: { coins: 1500, spins: 10 } },
];

export const ACHIEVEMENTS = [
  { id: 'a_spin1', title: 'Первая крутка', target: 1, get: (s) => s.lifetime.spins, reward: { coins: 50 } },
  { id: 'a_spin100', title: '100 круток', target: 100, get: (s) => s.lifetime.spins, reward: { coins: 250, spins: 5 } },
  { id: 'a_spin500', title: '500 круток', target: 500, get: (s) => s.lifetime.spins, reward: { coins: 1000, spins: 10 } },
  { id: 'a_spin2000', title: '2000 круток', target: 2000, get: (s) => s.lifetime.spins, reward: { coins: 4000, spins: 25 } },
  { id: 'a_epic', title: 'Первый эпик', target: 1, get: (s) => s.lifetime.tiers[3], reward: { coins: 300, spins: 3 } },
  { id: 'a_legend', title: 'Первая легендарка', target: 1, get: (s) => s.lifetime.tiers[4], reward: { coins: 2000, spins: 10 } },
  { id: 'a_mythic', title: 'Первый мифик', target: 1, get: (s) => s.lifetime.tiers[5], reward: { coins: 10000, spins: 30 } },
  { id: 'a_coll25', title: 'Коллекционер: 25 юзов', target: 25, get: (s, it) => it.length, reward: { coins: 500, spins: 5 } },
  { id: 'a_coll100', title: 'Коллекционер: 100 юзов', target: 100, get: (s, it) => it.length, reward: { coins: 3000, spins: 15 } },
  { id: 'a_value10k', title: 'Коллекция на 10 000 ₽', target: 10000, get: (s, it) => it.reduce((a, d) => a + d.price, 0), reward: { coins: 1000 } },
  { id: 'a_value100k', title: 'Коллекция на 100 000 ₽', target: 100000, get: (s, it) => it.reduce((a, d) => a + d.price, 0), reward: { coins: 8000, spins: 20 } },
  { id: 'a_streak7', title: '7 дней подряд', target: 7, get: (s) => s.daily.streak, reward: { coins: 1000, spins: 10 } },
  { id: 'a_rich', title: 'Накопи 10 000 ₽', target: 10000, get: (s) => s.coins, reward: { coins: 500 } },
];

const ALL = [...DAILY_TASKS, ...PERM_TASKS, ...ACHIEVEMENTS];
export const findDef = (id) => ALL.find((d) => d.id === id);

const isDaily = (id) => id.startsWith('d_');

export const isClaimed = (state, id) => Boolean(isDaily(id) ? state.tasks.claimed[id] : state.claimed[id]);

export function progressOf(def, state, items) {
  return Math.min(def.target, def.get(state, items));
}

export const isDone = (def, state, items) => def.get(state, items) >= def.target;

export const isClaimable = (def, state, items) => isDone(def, state, items) && !isClaimed(state, def.id);

export function claimableCount(state, items) {
  return ALL.filter((d) => isClaimable(d, state, items)).length;
}
