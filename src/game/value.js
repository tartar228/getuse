import { GRADE_MULT } from './analyze.js';

// ---------- тиры ----------
// min — нижняя граница «индекса ценности» v0 (цена без множителя платформы).
export const TIERS = [
  { id: 'common', name: 'Обычный', color: '#8b93ad', min: 0 },
  { id: 'uncommon', name: 'Необычный', color: '#5fd38d', min: 30 },
  { id: 'rare', name: 'Редкий', color: '#4da8ff', min: 220 },
  { id: 'epic', name: 'Эпический', color: '#b57bff', min: 1000 },
  { id: 'legendary', name: 'Легендарный', color: '#ff9a3c', min: 3500 },
  { id: 'mythic', name: 'Мифический', color: '#ff5c8a', min: 12000 },
];

export function tierOf(v0) {
  let t = 0;
  for (let i = 1; i < TIERS.length; i++) if (v0 >= TIERS[i].min) t = i;
  return t;
}

// ---------- формула ценности ----------
// v0 = длина × слово × чистота × паттерн × бонус платформы
// price = v0 × множитель платформы (на бирже потом ещё рыночные события)

// Чем короче, тем дороже: каждый символ длины ≈ в 1.75 раза
export function lengthBase(len) {
  return Math.max(0.6, 8 * Math.pow(1.75, 10 - len));
}

// Чистота. Цифры обесценивают юз почти сразу: одна цифра ≈ ×0.3, три — уже мусор.
// Разделители (_ . -) штрафуются мягче. Только буквы — бонус.
const DIGIT_PENALTY = [1, 0.3, 0.15, 0.08, 0.05];
const SEP_PENALTY = [1, 0.7, 0.5, 0.35];

// Чистота как набор строк «за что» — из них же считается итоговый множитель
function purityRows(a) {
  if (a.digits === 0 && a.seps === 0) {
    // только буквы: бонус за чистоту получает то, что звучит, слово или паттерн;
    // бессмысленная буквенная каша (kzzbzf) бонуса не получает
    return a.word || a.sounds || a.patterns.length
      ? [{ label: 'Чистый: только буквы', mult: 1.5 }]
      : [{ label: 'Бессмысленный набор букв', mult: 0.8 }];
  }
  if (a.letters === 0 && a.seps === 0) return [{ label: 'Только цифры', mult: 0.8 }];
  const rows = [];
  if (a.digits) {
    rows.push({
      label: `Цифры (${a.digits})`,
      mult: DIGIT_PENALTY[Math.min(a.digits, DIGIT_PENALTY.length - 1)],
    });
  }
  if (a.seps) {
    rows.push({
      label: `Разделители (${a.seps})`,
      mult: SEP_PENALTY[Math.min(a.seps, SEP_PENALTY.length - 1)],
    });
  }
  return rows;
}

// Дополнительный множитель категории слова: известные ники и мемы ценятся выше обычных слов
const CAT_BONUS = { word: 1, name: 1.1, pop: 1.2, meme: 1.25, star: 1.5 };

function wordMult(a) {
  if (!a.word) return 1;
  const base = 1 + (a.word.mult - 1) * Math.pow(a.word.cov, 1.5);
  return base * (1 + (CAT_BONUS[a.word.cat] - 1) * a.word.cov);
}

// Звучание: короткие благозвучные юзы без слов (kavo, mira)
const SOUND_BONUS = { 4: 2.2, 5: 2.0, 6: 1.6, 7: 1.3, 8: 1.15 };

function soundMult(a) {
  return a.sounds && !a.word ? SOUND_BONUS[a.len] || 1 : 1;
}

function patternMult(patterns) {
  if (!patterns.length) return 1;
  const vals = patterns.map((p) => {
    switch (p.type) {
      case 'mono':
        return 5;
      case 'cycle':
        return 3;
      case 'palindrome':
        return Math.min(4, 2.5 + 0.25 * (p.len - 4));
      case 'ladder':
        return p.full ? 4.5 : 1 + 0.3 * (p.len - 3);
      case 'run':
        return 1 + 0.25 * (p.len - 2);
      default:
        return 1;
    }
  });
  vals.sort((x, y) => y - x);
  // лучший паттерн + небольшая надбавка за каждый следующий
  return vals.reduce((acc, v, i) => (i === 0 ? v : acc * (1 + (v - 1) * 0.2)), 1);
}

// Бонус правил платформы: в Telegram юзы короче 5 символов коллекционные,
// в X четырёхбуквенные хэндлы — самые короткие из возможных
function platformBonus(a, platform) {
  if (platform.id === 'telegram' && a.len < 5) return 1 + (5 - a.len) * 0.25;
  if (platform.id === 'x' && a.len === 4) return 1.4;
  return 1;
}

// Красивое округление: 2 значащие цифры
export function niceRound(x) {
  if (x < 10) return Math.max(1, Math.round(x));
  const mag = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / mag) * mag;
}

export function valuate(a, platform) {
  const purity = purityRows(a);
  const parts = {
    length: lengthBase(a.len),
    word: wordMult(a),
    purity: purity.reduce((m, r) => m * r.mult, 1),
    pattern: patternMult(a.patterns),
    sound: soundMult(a),
    bonus: platformBonus(a, platform),
  };
  const v0 =
    parts.length * parts.word * parts.purity * parts.pattern * parts.sound * parts.bonus;

  // «Из чего цена»: база за длину и список множителей с пояснением
  const rows = [];
  if (a.word) {
    const label = CAT_LABEL[a.word.cat] || GRADE_LABEL[a.word.grade];
    rows.push({ label: `${label}: ${a.word.words.join(' + ')}`, mult: parts.word });
  }
  rows.push(...purity);
  if (a.patterns.length) {
    const names = a.patterns.map((p) => (p.type === 'ladder' && !p.full ? 'лесенка внутри' : PATTERN_NAMES[p.type].toLowerCase()));
    rows.push({ label: `Паттерн: ${names.join(', ')}`, mult: parts.pattern });
  }
  if (parts.sound !== 1) rows.push({ label: 'Звучит как имя', mult: parts.sound });
  if (parts.bonus !== 1) {
    rows.push({
      label: platform.id === 'telegram' ? 'Коллекционный (короче 5 символов)' : 'Короткий хэндл',
      mult: parts.bonus,
    });
  }
  rows.push({ label: `Платформа ${platform.name}`, mult: platform.priceMult });

  return {
    v0,
    tier: tierOf(v0),
    price: niceRound(v0 * platform.priceMult),
    parts,
    breakdown: { base: Math.round(parts.length), len: a.len, rows },
    tags: describe(a, platform),
  };
}

// ---------- человекочитаемые теги ----------
const PATTERN_NAMES = {
  mono: 'Повтор',
  run: 'Серия символов',
  cycle: 'Цикл',
  palindrome: 'Палиндром',
  ladder: 'Лесенка',
};
const GRADE_LABEL = { 1: 'Слово', 2: 'Крутое слово', 3: 'Топ-слово' };
const CAT_LABEL = { name: 'Имя', pop: 'Поп-культура', meme: 'Мем', star: 'Известный ник' };

function describe(a, platform) {
  const tags = [];
  if (a.word) {
    const label = CAT_LABEL[a.word.cat] || GRADE_LABEL[a.word.grade];
    tags.push(`${label}: ${a.word.words.join(' + ')}`);
  }
  if (a.sounds && !a.word) tags.push('Звучный');
  if (a.digits > 0) tags.push('Цифры снижают цену');
  for (const p of a.patterns) {
    if (p.type === 'ladder' && !p.full) tags.push('Лесенка внутри');
    else tags.push(PATTERN_NAMES[p.type]);
  }
  if (a.digits === 0 && a.seps === 0) tags.push('Чистый');
  if (platform.id === 'telegram' && a.len < 5) tags.push('Коллекционный');
  else if (a.len <= 4) tags.push('Короткий');
  if (!tags.length) tags.push('Мусор');
  return tags;
}

export { GRADE_MULT };
