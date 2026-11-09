import { SPIN_COST } from './economy.js';

// Бесплатные крутки копятся по таймеру: 1 за 5 минут, запас до 20.
// Купленные крутки могут превышать запас — они не сгорают.
export const FREE_INTERVAL = 5 * 60 * 1000;
export const FREE_CAP = 20;
export const START_SPINS = 10;

// Докручиваем накопленные крутки. Возвращает тот же объект, если ничего не изменилось.
export function refill(state, now) {
  if (state.spins >= FREE_CAP) return state;
  if (!state.spinsAt) return { ...state, spinsAt: now };
  const gained = Math.floor((now - state.spinsAt) / FREE_INTERVAL);
  if (gained <= 0) return state;
  const spins = Math.min(FREE_CAP, state.spins + gained);
  return {
    ...state,
    spins,
    spinsAt: spins >= FREE_CAP ? now : state.spinsAt + gained * FREE_INTERVAL,
  };
}

// Сколько мс до следующей бесплатной крутки (null, если запас полон)
export function nextSpinIn(state, now) {
  if (state.spins >= FREE_CAP || !state.spinsAt) return null;
  return Math.max(0, state.spinsAt + FREE_INTERVAL - now);
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
