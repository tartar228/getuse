import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { sellValue, scrapValue } from '../game/economy.js';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { rub, rubAt } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';

// Карточка юза из коллекции
export default function ItemScreen({ drop, onSell, onScrap, onShare, onList }) {
  if (!drop) return <div className="screen"><p className="note">Этого юза уже нет в коллекции.</p></div>;
  const tier = TIERS[drop.tier];
  return (
    <div className="screen">
      <div className={`stage tier-${drop.tier}`} style={{ '--tier': tier.color }}>
        <div className="item-name">@{drop.name}</div>
        <div className="item-platform">
          <PlatformMark id={drop.platform} /> {PLATFORMS[drop.platform].name}
        </div>
        <div className="tier-badge" style={{ '--tier': tier.color }}>
          {tier.name}
        </div>
        <div className="price">≈ {rubAt(drop.price)}</div>
        <PriceBreakdown breakdown={drop.breakdown} />
      </div>

      <div className="actions two">
        <ConfirmButton ask={drop.tier >= 3} hint={`+${rub(sellValue(drop))}`} onConfirm={onSell}>
          Продать сразу
        </ConfirmButton>
        <ConfirmButton ask={drop.tier >= 3} hint={`+${rub(scrapValue(drop))}`} onConfirm={onScrap}>
          Разобрать
        </ConfirmButton>
      </div>
      <button className="btn primary" onClick={onList}>
        Выставить на биржу
        <small>продать дороже, чем «сразу»</small>
      </button>
      <button className="link" onClick={() => onShare(drop)}>
        Поделиться дропом
      </button>
    </div>
  );
}
