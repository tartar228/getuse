import Plate from '../components/Plate.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { LUCK_BONUS } from '../game/talismans.js';
import { SLOT_PACK } from '../game/levels.js';
import { fmtLuck, fmtThin } from '../format.js';

export const DEFAULT_FILTER = { platform: 'all', tier: 'all', sort: 'value-desc' };

const SORTS = [
  { id: 'value-desc', label: 'Дороже' },
  { id: 'value-asc', label: 'Дешевле' },
  { id: 'new', label: 'Новые' },
];

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
  const shown = applyFilter([...items], filter);
  const total = items.reduce((s, d) => s + d.price, 0);
  const set = (patch) => onFilter({ ...filter, ...patch });
  const byId = Object.fromEntries(items.map((d) => [d.id, d]));
  const full = items.length >= capacity;

  return (
    <div className="screen">
      <div className="titlebar">
        <h1 className="display">Коллекция</h1>
        <span className="overline">
          {items.length} / {capacity} мест
        </span>
      </div>

      <section className="worth">
        <div className="overline">Стоимость коллекции</div>
        <div className="worth-num">
          {fmtThin(total)}
          <span className="cur"> ₽</span>
        </div>
        <ProgressBar value={items.length} max={capacity} label="Занято мест" />
        <div className="worth-foot">
          <span className="muted">{full ? 'Коллекция заполнена: новый юз не войдёт' : `Свободно мест: ${capacity - items.length}`}</span>
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
        <div className="talis">
          {TIERS.map((t, i) => {
            const d = byId[talismans[i]];
            const ok = d && d.tier === i;
            return (
              <button
                key={t.id}
                className={ok ? 'tal filled' : 'tal'}
                style={{ '--tier': t.color }}
                onClick={() => ok && onOpen(d.id)}
                aria-label={`${t.name}: ${ok ? `@${d.name}` : 'пусто'}`}
              >
                <span className="tal-name">{t.name}</span>
                {ok ? <Plate name={d.name} platform={d.platform} series={d.series} size="xs" /> : <span className="tal-empty">пусто</span>}
                <span className="tal-bonus">+{LUCK_BONUS[i].toFixed(2)}</span>
              </button>
            );
          })}
        </div>
        <p className="note">Открой юз и нажми «Сделать талисманом»: по одному на каждую редкость, чем она выше, тем больше удачи.</p>
      </section>

      <section>
        <div className="overline-row">
          <span className="overline">Юзы · {shown.length}</span>
        </div>
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
        <div className="seg-row scroll" style={{ marginTop: 8 }}>
          <button className={filter.tier === 'all' ? 'seg-pill active' : 'seg-pill'} onClick={() => set({ tier: 'all' })}>
            Любая редкость
          </button>
          {TIERS.map((t, i) => (
            <button key={t.id} className={filter.tier === i ? 'seg-pill active' : 'seg-pill'} onClick={() => set({ tier: i })}>
              <span className="dot" style={{ background: t.color }} />
              {t.name}
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

        {items.length === 0 ? (
          <p className="note">Пока пусто. Забирай дропы кнопкой «В коллекцию».</p>
        ) : shown.length === 0 ? (
          <p className="note">С такими фильтрами ничего нет.</p>
        ) : (
          <div className="plain-list">
            {shown.map((d) => (
              <button className="crow" key={d.id} onClick={() => onOpen(d.id)}>
                <span className="crow-main">
                  <span className="rtier" style={{ color: TIERS[d.tier].color }}>
                    <span className="rdot" style={{ background: TIERS[d.tier].color }} />
                    {TIERS[d.tier].name}
                    {Object.values(talismans).includes(d.id) && <span className="tal-tag">талисман</span>}
                  </span>
                  <Plate name={d.name} platform={d.platform} series={d.series} size="sm" />
                </span>
                <span className="crow-price">{fmtThin(d.price)} ₽</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
