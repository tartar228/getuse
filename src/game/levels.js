// Уровень, слоты коллекции и ништяки за уровни. Уровень на шансы выпадения не влияет:
// удачу дают только талисманы (см. talismans.js).

// ---------- базовые числа ----------
export const BASE_CAP = 20; // запас бесплатных круток
export const BASE_INTERVAL = 5 * 60 * 1000; // одна бесплатная крутка раз в 5 минут
export const BASE_SLOTS = 12; // мест в коллекции
export const MAX_BATCH = 5; // круток за раз

// ---------- опыт ----------
// Опыт за выбитый юз по тиру, плюс за продажу на бирже, бонус и награды заданий
export const XP_BY_TIER = [6, 10, 20, 50, 120, 300];
export const XP_MARKET_SALE = 40;
export const XP_DAILY = 30;
export const XP_CLAIM = 25;

// сколько опыта нужно, чтобы перейти с уровня l на l+1
export const xpToNext = (l) => 100 + 60 * (l - 1);

export function levelOf(xp) {
  let level = 1;
  let left = Math.max(0, xp || 0);
  while (left >= xpToNext(level)) {
    left -= xpToNext(level);
    level++;
  }
  return { level, into: left, need: xpToNext(level) };
}

// ---------- награды и ништяки ----------
// За каждый уровень: монеты и крутка. Ништяки навсегда:
//  каждые 3 уровня +1 место в коллекции;
//  уровни 5, 15, 25…: крутки копятся быстрее (−20 с, но не быстрее 2 минут);
//  уровни 10, 20, 30…: запас круток +5.
export const levelReward = (l) => ({ coins: 40 * l, spins: 1 });

export const slotsAt = (l) => Math.floor(l / 3);
const speedUps = (l) => Math.floor((l + 5) / 10);
export const capAt = (l) => BASE_CAP + 5 * Math.floor(l / 10);
export const intervalAt = (l) => Math.max(120000, BASE_INTERVAL - 20000 * speedUps(l));

// ништяки, которые открываются именно на этом уровне (для тоста и подсказки «Дальше»)
export function perksOfLevel(l) {
  const out = [];
  if (l % 3 === 0) out.push('+1 место в коллекции');
  if (l % 10 === 5 && intervalAt(l) < intervalAt(l - 1)) out.push('крутки копятся быстрее: −20 с');
  if (l % 10 === 0) out.push('запас круток +5');
  return out;
}

// ближайший уровень с ништяком; short — короткая подпись для полоски уровня
export function nextPerk(l) {
  for (let n = l + 1; n < l + 12; n++) {
    const p = perksOfLevel(n);
    if (!p.length) continue;
    const short = [];
    if (n % 3 === 0) short.push('+1 место');
    if (n % 10 === 5 && intervalAt(n) < intervalAt(n - 1)) short.push('крутки быстрее');
    if (n % 10 === 0) short.push('запас +5');
    return { level: n, text: p.join(', '), short: short.join(', ') };
  }
  return null;
}

// ---------- слоты ----------
// Купленные места идут парами: цена растёт на 60% с каждой покупкой. Это главный денежный сток.
export const SLOT_PACK = 2;
export const slotPrice = (bought) => Math.round((400 * Math.pow(1.6, bought)) / 50) * 50;
