import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { rub } from '../format.js';

// Заглушка этапа 1: просто список того, что игрок забрал за сессию.
// Полноценная коллекция с фильтрами, витриной и сохранением — этап 2.
export default function CollectionScreen({ collection }) {
  return (
    <div className="screen">
      <h2 className="h2">Коллекция</h2>
      {collection.length === 0 ? (
        <p className="note">Пока пусто. Забирай дропы кнопкой «В коллекцию».</p>
      ) : (
        <div className="card">
          {collection.map((d) => (
            <div className="coll-row" key={d.id}>
              <span className="dot" style={{ background: TIERS[d.tier].color }} />
              <span className="coll-name">@{d.name}</span>
              <span className="coll-meta">
                {PLATFORMS[d.platform].icon} {rub(d.price)}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="note">Фильтры, сортировка, витрина и сохранение — на следующем этапе.</p>
    </div>
  );
}
