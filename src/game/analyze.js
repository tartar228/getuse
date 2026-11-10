import { WORD_GRADE, WORD_CAT, MAX_WORD_LEN } from './words.js';

// Множитель цены слова по градации словаря
export const GRADE_MULT = { 1: 3, 2: 8, 3: 20 };

const CAT_PRIORITY = { word: 0, biz: 1, name: 1, pop: 2, meme: 3, star: 4 };

// Разбор готового юза: длина, слова, чистота, паттерны.
// Ценность считается по результату разбора, а не по тому, как юз был сгенерирован:
// случайный мусор, который случайно оказался палиндромом, тоже получит паттерн.
export function analyze(name) {
  const len = name.length;
  let letters = 0;
  let digits = 0;
  for (let i = 0; i < len; i++) {
    const c = name.charCodeAt(i);
    if (c >= 97 && c <= 122) letters++;
    else if (c >= 48 && c <= 57) digits++;
  }
  const seps = len - letters - digits;
  const core = name.replace(/[^a-z0-9]/g, '');
  return {
    name,
    len,
    letters,
    digits,
    seps,
    core,
    word: findWords(name),
    patterns: findPatterns(core),
    sounds: sounds(name),
  };
}

// ---------- слова ----------

// Для каждой буквенной «пробежки» ищем разбиение на слова словаря, покрывающее максимум букв.
function bestCover(run) {
  const n = run.length;
  if (n < 3) return null;
  const cov = new Array(n + 1).fill(0);
  const score = new Array(n + 1).fill(0);
  const words = new Array(n + 1).fill(null);
  words[0] = [];
  for (let i = 1; i <= n; i++) {
    cov[i] = cov[i - 1];
    score[i] = score[i - 1];
    words[i] = words[i - 1];
    for (let l = 3; l <= Math.min(MAX_WORD_LEN, i); l++) {
      const w = run.slice(i - l, i);
      const g = WORD_GRADE[w];
      if (!g) continue;
      const c = cov[i - l] + l;
      const s = score[i - l] + l * GRADE_MULT[g];
      if (c > cov[i] || (c === cov[i] && s > score[i])) {
        cov[i] = c;
        score[i] = s;
        words[i] = [...words[i - l], w];
      }
    }
  }
  return words[n].length ? { words: words[n], cov: cov[n], score: score[n] } : null;
}

function findWords(name) {
  const runs = name.match(/[a-z]{3,}/g);
  if (!runs) return null;
  let covered = 0;
  let score = 0;
  let list = [];
  for (const run of runs) {
    const r = bestCover(run);
    if (!r) continue;
    covered += r.cov;
    score += r.score;
    list = list.concat(r.words);
  }
  const cov = covered / name.length;
  if (!list.length || cov < 0.5) return null;
  // категория слова с наибольшим приоритетом (известный ник важнее мема, мем важнее имени)
  let cat = 'word';
  for (const w of list) {
    if (CAT_PRIORITY[WORD_CAT[w]] > CAT_PRIORITY[cat]) cat = WORD_CAT[w];
  }
  return {
    words: list,
    cov,
    mult: score / covered, // средний множитель градации, взвешенный по длине слов
    grade: Math.max(...list.map((w) => WORD_GRADE[w])),
    cat,
  };
}

// ---------- звучание ----------

// «Хорошо звучащий» юз: только буквы, чередование гласных и согласных,
// без каши из согласных. Такие юзы (kavo, mira, zelu) ценятся, даже если это не слово.
const VOWELS = new Set('aeiouy');

function sounds(name) {
  if (!/^[a-z]{4,8}$/.test(name)) return false;
  let vowels = 0;
  let cRun = 0;
  let vRun = 0;
  for (const ch of name) {
    if (VOWELS.has(ch)) {
      vowels++;
      vRun++;
      cRun = 0;
    } else {
      cRun++;
      vRun = 0;
    }
    if (cRun >= 3 || vRun >= 3) return false;
  }
  const ratio = vowels / name.length;
  return ratio >= 0.35 && ratio <= 0.55;
}

// ---------- паттерны ----------

const isLetter = (c) => c >= 97 && c <= 122;
const isDigit = (c) => c >= 48 && c <= 57;

function findPatterns(core) {
  const out = [];
  const n = core.length;
  if (n < 3) return out;

  const mono = new Set(core).size === 1;
  if (mono) {
    out.push({ type: 'mono', len: n });
  } else {
    let best = 1;
    let cur = 1;
    for (let i = 1; i < n; i++) {
      cur = core[i] === core[i - 1] ? cur + 1 : 1;
      if (cur > best) best = cur;
    }
    if (best >= 3) out.push({ type: 'run', len: best });
  }

  // повторяющийся блок: abab, xoxo, 1212, abcabc
  if (!mono && n >= 4) {
    for (let u = 2; u <= 4 && u <= n / 2; u++) {
      if (n % u) continue;
      const unit = core.slice(0, u);
      if (new Set(unit).size > 1 && unit.repeat(n / u) === core) {
        out.push({ type: 'cycle', len: n });
        break;
      }
    }
  }

  // палиндром: abba, 12321
  if (!mono && n >= 4) {
    let pal = true;
    for (let i = 0, j = n - 1; i < j; i++, j--) {
      if (core[i] !== core[j]) {
        pal = false;
        break;
      }
    }
    if (pal) out.push({ type: 'palindrome', len: n });
  }

  // лесенка: abcd, 1234, dcba, 4321 (внутри одного класса символов)
  let bestLadder = 0;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < n; i++) {
    const a = core.charCodeAt(i - 1);
    const b = core.charCodeAt(i);
    const same = (isLetter(a) && isLetter(b)) || (isDigit(a) && isDigit(b));
    const d = b - a;
    if (same && (d === 1 || d === -1) && (dir === 0 || dir === d)) {
      run++;
      dir = d;
    } else {
      run = same && (d === 1 || d === -1) ? 2 : 1;
      dir = run === 2 ? d : 0;
    }
    if (run > bestLadder) bestLadder = run;
  }
  if (bestLadder >= 4) out.push({ type: 'ladder', len: bestLadder, full: bestLadder === n });

  return out;
}
