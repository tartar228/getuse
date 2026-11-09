import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { rub, rubAt } from '../format.js';

// Карточка юза из коллекции
export default function ItemScreen({ drop, onSell, onScrap, onShare }) {
  if (!drop) return <div className="screen"><p className="note">Этого юза уже нет в коллекции.</p></div>;
  const tier = TIERS[drop.tier];
  return (
    <div className="screen">
      <div className="stage" style={{ '--tier': tier.color, borderColor: tier.color }}>
        <div className="item-name">@{drop.name}</div>
        <div className="item-platform">
          {PLATFORMS[drop.platform].icon} {PLATFORMS[drop.platform].name}
        </div>
        <div className="tier-badge" style={{ background: tier.color }}>
          {tier.name}
        </div>
        <div className="price">≈ {rubAt(drop.price)}</div>
        <PriceBreakdown breakdown={drop.breakdown} />
      </div>

      <div className="actions two">
        <button className="btn" onClick={onSell}>
          Продать сразу
          <small>+{rub(sellValue(drop))}</small>
        </button>
        <button className="btn" onClick={onScrap}>
          Разобрать
          <small>+{rub(scrapValue(drop))}</small>
        </button>
      </div>
      <button className="link" onClick={() => onShare(drop)}>
        Поделиться дропом
      </button>
      <p className="note">Выставить на биржу по своей цене можно будет на этапе 4.</p>
    </div>
  );
}
