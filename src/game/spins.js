import { SPIN_COST } from './economy.js';
import { BASE_CAP, BASE_INTERVAL, levelOf, capAt, intervalAt } from './levels.js';

// Бесплатные крутки копятся по таймеру: 1 за 5 минут, запас до 20.
// Уровни ускоряют таймер и увеличивают запас (см. levels.js).
// Купленные крутки могут превышать запас — они не сгорают.
export const FREE_INTERVAL = BASE_INTERVAL;
export const FREE_CAP = BASE_CAP;
export const START_SPINS = 10;

const levelNow = (state) => levelOf(state.xp).level;
export const capOf = (state) => capAt(levelNow(state));
export const intervalOf = (state) => intervalAt(levelNow(state));

// Докручиваем накопленные крутки. Возвращает тот же объект, если ничего не изменилось.
export function refill(state, now) {
  const cap = capOf(state);
  if (state.spins >= cap) return state;
  if (!state.spinsAt) return { ...state, spinsAt: now };
  const interval = intervalOf(state);
  const gained = Math.floor((now - state.spinsAt) / interval);
  if (gained <= 0) return state;
  const spins = Math.min(cap, state.spins + gained);
  return {
    ...state,
    spins,
    spinsAt: spins >= cap ? now : state.spinsAt + gained * interval,
  };
}

// Сколько мс до следующей бесплатной крутки (null, если запас полон)
export function nextSpinIn(state, now) {
  if (state.spins >= capOf(state) || !state.spinsAt) return null;
  return Math.max(0, state.spinsAt + intervalOf(state) - now);
}

// Цена покупных круток растёт при частых покупках и восстанавливается со временем:
// каждая покупка +4%, каждые 2 минуты счётчик покупок уменьшается на 1.
// Это не даёт бесконечно «крутить в плюс» за счёт одной лишь продажи дропов.
export const BUY_GROWTH = 1.04;
export const BUY_DECAY = 2 * 60 * 1000;

export function recentBuys(state, now) {
  if (!state.buyCount) return 0;
  return Math.max(0, state.buyCount - Math.floor((now - state.buyAt) / BUY_DECAY));
}

export function buyPrice(state, now, count = 1) {
  let n = recentBuys(state, now);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.round(SPIN_COST * Math.pow(BUY_GROWTH, n));
    n++;
  }
  return total;
}
