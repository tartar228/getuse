import { SPIN_COST } from './economy.js';
import { BASE_CAP, BASE_INTERVAL, levelOf, capAt, intervalAt } from './levels.js';

// Крутить можно за @ прямо с баланса: 1 @ = 25 ₽ = одна крутка. Отдельных «круток» нет, купить их нельзя.
// Чтобы никто не застрял с пустым кошельком, баланс подзаряжается сам: пока на нём меньше 20 @ (500 ₽),
// каждые 5 минут добавляется 1 @. Выше этого порога подзарядка не идёт. Уровни ускоряют её и поднимают порог.
export const FREE_INTERVAL = BASE_INTERVAL;
export const FREE_CAP = BASE_CAP;

const levelNow = (state) => levelOf(state.xp).level;
export const capOf = (state) => capAt(levelNow(state)); // порог подзарядки в @
export const intervalOf = (state) => intervalAt(levelNow(state));
export const capCoins = (state) => capOf(state) * SPIN_COST;

// Сколько @ (круток) можно оплатить с баланса
export const affordable = (state) => Math.floor(state.coins / SPIN_COST);

// Начисляем накопившуюся подзарядку. Возвращает тот же объект, если ничего не изменилось.
// spinsAt: с какого момента копится следующая @ (0: баланс не ниже порога, таймер стоит).
export function refill(state, now) {
  const cap = capCoins(state);
  if (state.coins >= cap) return state.spinsAt ? { ...state, spinsAt: 0 } : state;
  if (!state.spinsAt) return { ...state, spinsAt: now };
  const interval = intervalOf(state);
  const gained = Math.floor((now - state.spinsAt) / interval);
  if (gained <= 0) return state;
  const coins = Math.min(cap, state.coins + gained * SPIN_COST);
  return { ...state, coins, spinsAt: coins >= cap ? 0 : state.spinsAt + gained * interval };
}

// Сколько мс до следующей @ из подзарядки (null, если баланс выше порога)
export function nextSpinIn(state, now) {
  if (state.coins >= capCoins(state) || !state.spinsAt) return null;
  return Math.max(0, state.spinsAt + intervalOf(state) - now);
}
