import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { LUCK_BONUS } from '../game/talismans.js';
import { SLOT_PACK } from '../game/levels.js';
import { fmtAt, fmtLuck, fmtThin } from '../format.js';

export const DEFAULT_FILTER = { platform: 'all', tier: 'all', sort: 'value-desc' };

const SORTS = [
  { id: 'value-desc', label: 'Дороже' },
  { id: 'new', label: 'Новые' },
];

// короткие названия редкостей для гнёзд талисманов
const SHORT = ['Обыч.', 'Необыч.', 'Редкий', 'Эпик', 'Легенд.', 'Мифик'];
const PLURAL = ['Обычные', 'Необычные', 'Редкие', 'Эпические', 'Легендарные', 'Мифические'];

export function applyFilter(items, f) {
  const list = items.filter(
    (d) => (f.platform === 'all' || d.platform === f.platform) && (f.tier === 'all' || d.tier === f.tier),
  );
  const by = {
    'value-desc': (a, b) => b.price - a.price || b.ts - a.ts,
    'value-asc': (a, b) => a.price - b.price || b.ts - a.ts,
    new: (a, b) => b.ts - a.ts,
  }[f.sort];
  return list.sort(by);
}

// Коллекция: ячейки (каждая окрашена редкостью юза), гнёзда талисманов и полки по редкости.
// items — «гидратированные» юзы (с ценой и тиром)
export default function CollectionScreen({
  items,
  filter,
  onFilter,
  onOpen,
  capacity,
  coins,
  slotCost,
  onBuySlots,
  talismans,
  luck,
}) {
  // раскрытые полки: по умолчанию открыты редкие и выше, а также короткие полки
  const [shelfOpen, setShelfOpen] = useState({});
  const set = (patch) => onFilter({ ...filter, ...patch });
  const total = items.reduce((s, d) => s + d.price, 0);
  const byId = useMemo(() => Object.fromEntries(items.map((d) => [d.id, d])), [items]);
  const talIds = Object.values(talismans);
  const free = Math.max(0, capacity - items.length);

  const shown = applyFilter([...items], filter);
  const shelves = TIERS.map((_, t) => shown.filter((d) => d.tier === t))
    .map((list, t) => ({ tier: t, list }))
    .filter((s) => s.list.length)
    .reverse();

  // ячейки: сначала самые редкие
  const cells = [...items].sort((a, b) => b.tier - a.tier || b.price - a.price);

  return (
    <div className="screen coll">
      <div className="titlebar">
        <h1 className="display">Коллекция</h1>
      </div>

      <section className="worth">
        <div className="worth-top">
          <div>
            <div className="overline">Стоимость</div>
            <div className="worth-num">
              {fmtThin(total)}
              <span className="cur"> ₽</span>
              <small>({fmtAt(total)})</small>
            </div>
          </div>
          <div className="worth-count">
            <b>{items.length}</b>/{capacity}
            <span>мест</span>
          </div>
        </div>
        <div className="cells" role="img" aria-label={`Занято ${items.length} из ${capacity} мест`}>
          {Array.from({ length: capacity }, (_, i) => {
            const d = cells[i];
            return <i key={i} className={d ? 'cell on' : 'cell'} style={d ? { '--tier': TIERS[d.tier].color } : undefined} />;
          })}
        </div>
        <div className="worth-foot">
          <span className="muted">{free ? `Свободно: ${free}` : 'Мест нет: новый юз не войдёт'}</span>
          <button className="btn-outline" disabled={coins < slotCost} onClick={onBuySlots}>
            +{SLOT_PACK} места · {fmtThin(slotCost)} ₽
          </button>
        </div>
      </section>

      <section>
        <div className="overline-row">
          <span className="overline">Талисманы</span>
          <span className="mult-link">Удача {fmtLuck(luck)}</span>
        </div>
        <div className="rings">
          {TIERS.map((t, i) => {
            const d = byId[talismans[i]];
            const ok = d && d.tier === i;
            return (
              <button
                key={t.id}
                className={ok ? 'ring on' : 'ring'}
                style={{ '--tier': t.color }}
                onClick={() => ok && onOpen(d.id)}
                aria-label={`${t.name}: ${ok ? `@${d.name}` : 'гнездо пустое'}`}
              >
                <span className="ring-c">{ok ? <Icon name="star" size={18} /> : <span className="ring-hole" />}</span>
                <span className="ring-n">{ok ? `@${d.name}` : SHORT[i]}</span>
                <span className="ring-b">+{LUCK_BONUS[i].toFixed(2)}</span>
              </button>
            );
          })}
        </div>
        <p className="note">Открой юз и нажми «Сделать талисманом»: одно гнездо на редкость, чем она выше, тем больше удачи.</p>
      </section>

      <section>
        <div className="coll-tools">
          <div className="seg-row scroll">
            <button className={filter.platform === 'all' ? 'seg-pill active' : 'seg-pill'} onClick={() => set({ platform: 'all' })}>
              Все
            </button>
            {PLATFORM_ORDER.map((id) => (
              <button key={id} className={filter.platform === id ? 'seg-pill active' : 'seg-pill'} onClick={() => set({ platform: id })}>
                {PLATFORMS[id].name.replace(' (Twitter)', '')}
              </button>
            ))}
          </div>
          <div className="sorts">
            {SORTS.map((s) => (
              <button key={s.id} className={filter.sort === s.id ? 'sort active' : 'sort'} onClick={() => set({ sort: s.id })}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="note">Пока пусто. Забирай дропы кнопкой «В коллекцию».</p>
        ) : shelves.length === 0 ? (
          <p className="note">С такими фильтрами ничего нет.</p>
        ) : (
          shelves.map(({ tier, list }) => {
            const t = TIERS[tier];
            const open = shelfOpen[tier] ?? (tier >= 2 || list.length <= 4);
            const sum = list.reduce((s, d) => s + d.price, 0);
            return (
              <div className="shelf" key={tier} style={{ '--tier': t.color }}>
                <button className="shelf-head" onClick={() => setShelfOpen((o) => ({ ...o, [tier]: !open }))} aria-expanded={open}>
                  <span className="shelf-name">
                    {tier >= 3 ? <Icon name="star" size={13} /> : <span className="rdot" style={{ background: t.color }} />}
                    {PLURAL[tier]}
                    <b>{list.length}</b>
                  </span>
                  <span className="shelf-sum">{fmtThin(sum)} ₽</span>
                  <span className={open ? 'shelf-chev open' : 'shelf-chev'}>
                    <Icon name="chevron" size={16} />
                  </span>
                </button>
                {open && (
                  <div className="shelf-grid">
                    {list.map((d) => (
                      <button className="ncard" key={d.id} onClick={() => onOpen(d.id)}>
                        <span className="ncard-nick">@{d.name}</span>
                        <span className="ncard-meta">
                          <Icon name={d.platform} size={12} /> {PLATFORMS[d.platform].name.replace(' (Twitter)', '')}
                          {talIds.includes(d.id) && <em>талисман</em>}
                        </span>
                        <span className="ncard-price">
                          {fmtThin(d.price)} ₽<small>({fmtAt(d.price)})</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
