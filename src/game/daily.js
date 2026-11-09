// Ежедневный вход со стриком: день считается по местному времени игрока.

const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function prevDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1).getTime());
}

// Награды ежедневного бонуса по дню стрика; после 7-го дня круг повторяется
export const DAILY_REWARDS = [
  { coins: 100 },
  { coins: 150 },
  { coins: 200, spins: 3 },
  { coins: 250 },
  { coins: 300, spins: 5 },
  { coins: 400 },
  { coins: 700, spins: 10 },
];

export const rewardForStreak = (streak) => DAILY_REWARDS[(Math.max(1, streak) - 1) % DAILY_REWARDS.length];

// Отмечаем заход: подряд идущие дни увеличивают стрик, пропуск сбрасывает его
export function touchVisit(state, now) {
  const day = dayKey(now);
  if (state.daily.visitDay === day) return state;
  const streak = state.daily.visitDay === prevDayKey(day) ? state.daily.streak + 1 : 1;
  return { ...state, daily: { ...state.daily, visitDay: day, streak } };
}

export const bonusAvailable = (state, now) =>
  state.daily.visitDay === dayKey(now) && state.daily.bonusDay !== dayKey(now);

export function formatReward(r) {
  const parts = [];
  if (r.coins) parts.push(`${r.coins.toLocaleString('ru-RU')} ₽`);
  if (r.spins) parts.push(`${r.spins} 🎟`);
  return parts.join(' + ');
}
