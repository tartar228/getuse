import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { rub, rubAt } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';

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
export default function CollectionScreen({ items, filter, onFilter, onOpen }) {
  const shown = applyFilter([...items], filter);
  const total = items.reduce((s, d) => s + d.price, 0);
  const set = (patch) => onFilter({ ...filter, ...patch });

  return (
    <div className="screen">
      <div className="summary card">
        <div>
          <div className="summary-num">{items.length}</div>
          <div className="summary-lbl">юзов</div>
        </div>
        <div>
          <div className="summary-num">{rub(total)}</div>
          <div className="summary-lbl">стоимость коллекции</div>
        </div>
      </div>

      <div className="chips">
        <button
          className={filter.platform === 'all' ? 'chip active' : 'chip'}
          onClick={() => set({ platform: 'all' })}
        >
          Все
        </button>
        {PLATFORM_ORDER.map((id) => (
          <button
            key={id}
            className={filter.platform === id ? 'chip active' : 'chip'}
            onClick={() => set({ platform: id })}
          >
            <PlatformMark id={id} /> {PLATFORMS[id].name}
          </button>
        ))}
      </div>

      <div className="chips">
        <button
          className={filter.tier === 'all' ? 'chip active' : 'chip'}
          onClick={() => set({ tier: 'all' })}
        >
          Любая редкость
        </button>
        {TIERS.map((t, i) => (
          <button
            key={t.id}
            className={filter.tier === i ? 'chip active' : 'chip'}
            onClick={() => set({ tier: i })}
          >
            <span className="dot" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
      </div>

      <div className="sorts">
        {SORTS.map((s) => (
          <button
            key={s.id}
            className={filter.sort === s.id ? 'sort active' : 'sort'}
            onClick={() => set({ sort: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="note">Пока пусто. Забирай дропы кнопкой «В коллекцию».</p>
      ) : shown.length === 0 ? (
        <p className="note">С такими фильтрами ничего нет.</p>
      ) : (
        <div className="card">
          {shown.map((d) => (
            <button className="coll-row" key={d.id} onClick={() => onOpen(d.id)}>
              <span className="dot" style={{ background: TIERS[d.tier].color }} />
              <span className="coll-name">@{d.name}</span>
              <span className="coll-meta">
                <PlatformMark id={d.platform} /> {rubAt(d.price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
