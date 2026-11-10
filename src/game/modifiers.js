// Строка модификаторов цены под плашкой: «Палиндром ×5 · Чистый ×1.5 · Слово ×4».
// Сработавшие множители показываются со значением, не сработавшие слово и паттерн остаются приглушёнными.

const WORD_ROW = /^(Слово|Крутое слово|Топ-слово|Ключевое слово|Имя|Поп-культура|Мем|Известный ник):/;

function chipOf(row) {
  const { label, mult } = row;
  if (WORD_ROW.test(label)) return { kind: 'word', label: label.split(':')[0], mult };
  if (label.startsWith('Паттерн:')) {
    const t = label.slice(8).trim();
    return { kind: 'pattern', label: t.charAt(0).toUpperCase() + t.slice(1), mult };
  }
  if (label.startsWith('Чистый')) return { kind: 'purity', label: 'Только буквы', mult };
  if (label.startsWith('Бессмысленный')) return { kind: 'purity', label: 'Набор букв', mult };
  if (label.startsWith('Только цифры')) return { kind: 'purity', label: 'Только цифры', mult };
  if (label.startsWith('Цифры')) return { kind: 'purity', label: 'Цифры', mult };
  if (label.startsWith('Разделител')) return { kind: 'purity', label: 'Разделители', mult };
  if (label.startsWith('Звучит')) return { kind: 'sound', label: 'Звучит', mult };
  if (label.startsWith('Коллекционный')) return { kind: 'bonus', label: 'Коллекционный', mult };
  if (label.startsWith('Короткий')) return { kind: 'bonus', label: 'Короткий', mult };
  return null; // «Платформа …» в строку не попадает: её видно в подписи
}

export function modChips(breakdown) {
  const chips = breakdown.rows.map(chipOf).filter(Boolean);
  const has = (k) => chips.some((c) => c.kind === k);
  if (!has('word')) chips.unshift({ kind: 'word', label: 'Слово', off: true });
  if (!has('pattern')) chips.splice(chips.findIndex((c) => c.kind !== 'word') === -1 ? chips.length : 1, 0, { kind: 'pattern', label: 'Паттерн', off: true });
  const order = { word: 0, pattern: 1, purity: 2, sound: 3, bonus: 4 };
  return chips.sort((a, b) => order[a.kind] - order[b.kind]);
}
