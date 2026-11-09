import { pick, pickWeighted, randInt } from './rng.js';
import { BUCKETS } from './words.js';
import { PLATFORMS } from './platforms.js';
import { appraise } from './appraise.js';

// Шансы пулов. Мусор выпадает чаще всего.
export const POOL_WEIGHTS = [
  ['junk', 80],
  ['pattern', 10],
  ['word', 10],
];

export const POOL_NAMES = { junk: 'Мусор', pattern: 'Паттерны', word: 'Слова' };

const LET = 'abcdefghijklmnopqrstuvwxyz';
const DIG = '0123456789';
const VOW = 'aeiou';
const CON = 'bcdfghjklmnpqrstvwxz';

const rch = (rng, s) => s[Math.floor(rng() * s.length)];
const randStr = (rng, alpha, n) => {
  let s = '';
  for (let i = 0; i < n; i++) s += rch(rng, alpha);
  return s;
};
const reverse = (s) => [...s].reverse().join('');

// ---------- пул «мусор» ----------

function junk(rng, p) {
  const len = pickWeighted(rng, [
    [6, 14],
    [7, 20],
    [8, 22],
    [9, 18],
    [10, 12],
    [11, 8],
    [12, 6],
  ]);
  const kind = pickWeighted(rng, [
    ['letters', 26],
    ['mix', 40],
    ['sep', 20],
    ['syll', 10],
    ['brand', 4],
  ]);
  switch (kind) {
    case 'brand': {
      // короткое благозвучное имя вроде kavo или mira — не слово, но хорошо звучит
      const n = pickWeighted(rng, [[4, 15], [5, 35], [6, 35], [7, 15]]);
      let s = '';
      while (s.length < n) s += rch(rng, CON) + rch(rng, VOW);
      return s.slice(0, n);
    }
    case 'letters':
      return randStr(rng, LET, len);
    case 'mix':
      return mixed(rng, p, len, false);
    case 'sep':
      return mixed(rng, p, len, true);
    default: {
      let s = '';
      while (s.length < len) s += rch(rng, CON) + rch(rng, VOW);
      return s.slice(0, len);
    }
  }
}

// буквы + цифры, опционально один разделитель внутри: xq_7k2lp
function mixed(rng, p, len, withSep) {
  const sepAt = withSep ? randInt(rng, 2, len - 3) : -1;
  let s = '';
  for (let i = 0; i < len; i++) {
    if (i === sepAt) {
      s += pick(rng, p.seps);
      continue;
    }
    const digit = rng() < 0.32 && (i > 0 || p.digitFirst);
    s += digit ? rch(rng, DIG) : rch(rng, LET);
  }
  return s;
}

// ---------- пул «паттерны» ----------

function pattern(rng, p) {
  const kind = pickWeighted(rng, [
    ['mono', 18],
    ['cycle', 22],
    ['pal', 22],
    ['ladder', 22],
    ['run', 16],
  ]);
  const useDigits = p.digitFirst && rng() < 0.25;
  const alpha = useDigits ? DIG : LET;
  let s;
  switch (kind) {
    case 'mono': {
      const len = pickWeighted(rng, [
        [3, 4],
        [4, 20],
        [5, 26],
        [6, 24],
        [7, 15],
        [8, 11],
      ]);
      s = rch(rng, alpha).repeat(len);
      break;
    }
    case 'cycle': {
      const u = randInt(rng, 2, 3);
      const reps = u === 2 ? randInt(rng, 2, 4) : randInt(rng, 2, 3);
      let unit = randStr(rng, alpha, u);
      while (new Set(unit).size < 2) unit = randStr(rng, alpha, u);
      s = unit.repeat(reps);
      break;
    }
    case 'pal': {
      const half = randInt(rng, 2, 5);
      const h = randStr(rng, alpha, half);
      s = h + (rng() < 0.5 ? rch(rng, alpha) : '') + reverse(h);
      break;
    }
    case 'ladder': {
      const len = pickWeighted(rng, [
        [4, 40],
        [5, 28],
        [6, 18],
        [7, 9],
        [8, 5],
      ]);
      const asc = rng() < 0.65;
      const size = alpha.length;
      const start = asc ? randInt(rng, 0, size - len) : randInt(rng, len - 1, size - 1);
      s = '';
      for (let i = 0; i < len; i++) s += alpha[asc ? start + i : start - i];
      break;
    }
    default: {
      // серия из 3–5 одинаковых символов посреди мусора
      const r = rch(rng, alpha).repeat(randInt(rng, 3, 5));
      s = randStr(rng, LET, randInt(rng, 1, 3)) + r + randStr(rng, LET, randInt(rng, 1, 3));
    }
  }
  // Telegram: юз начинается с буквы
  if (!p.digitFirst && !/^[a-z]/.test(s)) s = rch(rng, LET) + s;
  return s;
}

// ---------- пул «слова» ----------

const PREFIXES = ['the', 'its', 'real', 'mr', 'im', 'iam', 'xx', 'mini', 'just', 'only'];
const SUFFIXES = ['xx', 'x', 'official', 'real', 'tv', 'hq', 'gg', 'pro', 'ofc', 'world'];
const LUCKY = ['1', '2', '3', '7', '9', '10', '11', '13', '21', '22', '23', '77', '99', '100', '101', '123', '222', '333', '777', '888', '999', '007', '1337', '2000', '2077'];

// Корзины словаря и шанс выбора слова из каждой
const WORD_BUCKETS = [
  ['w1', 42],
  ['w2', 20],
  ['w3', 5],
  ['name', 13],
  ['meme', 10],
  ['star', 5],
  ['pop', 5],
];

function pickWord(rng) {
  return pick(rng, BUCKETS[pickWeighted(rng, WORD_BUCKETS)]);
}

function someNumber(rng) {
  return pickWeighted(rng, [
    [() => pick(rng, LUCKY), 45],
    [() => String(randInt(rng, 1, 99)), 35],
    [() => String(randInt(rng, 100, 9999)), 20],
  ])();
}

function word(rng, p) {
  const w = pickWord(rng);
  const sep = () => pick(rng, p.seps);
  const kind = pickWeighted(rng, [
    ['pure', 30],
    ['num', 26],
    ['two', 12],
    ['join', 6],
    ['tag', 14],
    ['sepnum', 12],
  ]);
  switch (kind) {
    case 'pure':
      return w;
    case 'num':
      return w + someNumber(rng);
    case 'two':
      return w + sep() + pickWord(rng);
    case 'join':
      return w + pickWord(rng);
    case 'tag': {
      const glue = rng() < 0.5 ? sep() : '';
      return rng() < 0.5 ? pick(rng, PREFIXES) + glue + w : w + glue + pick(rng, SUFFIXES);
    }
    default:
      return w + sep() + someNumber(rng);
  }
}

const BUILDERS = { junk, pattern, word };

// ---------- сборка ----------

// Генератор всегда строже платформы: юз не начинается/не заканчивается разделителем
// и не содержит двух разделителей подряд — так юзы выглядят аккуратно.
function acceptable(s, p) {
  return (
    s.length >= p.minLen &&
    s.length <= p.maxLen &&
    p.validate(s) &&
    !/^[._-]|[._-]$|[._-]{2}/.test(s)
  );
}

export function generateName(rng, p, pool) {
  for (let i = 0; i < 10; i++) {
    const s = BUILDERS[pool](rng, p);
    if (acceptable(s, p)) return { name: s, pool };
  }
  for (;;) {
    const s = junk(rng, p);
    if (acceptable(s, p)) return { name: s, pool: 'junk' };
  }
}

let counter = 0;

export function rollDrop(platformId, rng = Math.random) {
  const p = PLATFORMS[platformId];
  const wanted = pickWeighted(rng, POOL_WEIGHTS);
  const { name, pool } = generateName(rng, p, wanted);
  return {
    id: `${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name,
    platform: platformId,
    pool,
    ts: Date.now(),
    ...appraise(name, platformId),
  };
}
