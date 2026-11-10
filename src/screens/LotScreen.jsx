import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { fairPrice } from '../game/market.js';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { rub, rubAt, fmtDelta } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';

// Лот NPC-продавца: можно купить
export default function LotScreen({ lot, drop, market, coins, onBuy }) {
  if (!lot) {
    return (
      <div className="screen">
        <p className="note">Этот лот уже купили. Загляни в ленту, там есть другие.</p>
      </div>
    );
  }
  const tier = TIERS[lot.tier];
  const fair = fairPrice(market, {
    platform: lot.platform,
    tier: lot.tier,
    base: lot.base,
    cat: lot.cat || null,
    short: lot.name.length <= 4,
  });
  const ratio = lot.ask / fair;
  return (
    <div className="screen">
      <div className={`stage tier-${lot.tier}`} style={{ '--tier': tier.color }}>
        <div className="item-name">@{lot.name}</div>
        <div className="item-platform">
          <PlatformMark id={lot.platform} /> {PLATFORMS[lot.platform].name} · продаёт {lot.seller}
        </div>
        <div className="tier-badge" style={{ '--tier': tier.color }}>
          {tier.name}
        </div>
        <div className="price">{rubAt(lot.ask)}</div>
        <div className="item-platform">
          рыночная цена сейчас {rub(fair)} ·{' '}
          <span className={ratio <= 1 ? 'mult up' : 'mult down'}>{fmtDelta(ratio)}</span>
        </div>
        {drop && <PriceBreakdown breakdown={drop.breakdown} />}
      </div>
      <button className="btn primary big" onClick={onBuy} disabled={coins < lot.ask}>
        {coins < lot.ask ? `Не хватает ${rub(lot.ask - coins)}` : `Купить за ${rub(lot.ask)}`}
      </button>
      <p className="note">
        Юз попадёт в коллекцию. Дальше его можно выставить на биржу по своей цене, комиссия при продаже 5%.
      </p>
    </div>
  );
}
