import AccountCard, { Nick } from '../components/AccountCard.jsx';
import PriceBreakdown from '../components/PriceBreakdown.jsx';
import { Mods, CardFoot } from '../components/Verdict.jsx';
import { PLATFORMS } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { fairPrice } from '../game/market.js';
import { rub, fmtDelta } from '../format.js';

// Лот NPC-продавца: можно купить
export default function LotScreen({ lot, drop, market, coins, free, onBuy }) {
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
  const poor = coins < lot.ask;
  return (
    <div className="screen">
      <div className={`stage tier-${lot.tier}`} style={{ '--tier': tier.color }}>
        <span className="stage-glow" aria-hidden="true" />
        <AccountCard
          platform={lot.platform}
          tier={lot.tier}
          nick={<Nick text={`@${lot.name}`} />}
          sub={`${PLATFORMS[lot.platform].name} · продаёт ${lot.seller}`}
          foot={<CardFoot tier={lot.tier} price={lot.ask} />}
        />
      </div>
      <div className="under">
        <div className="platform-line">
          рыночная цена сейчас {rub(fair)} · <span className={ratio <= 1 ? 'mult up' : 'mult down'}>{fmtDelta(ratio)}</span>
        </div>
        {drop && <Mods breakdown={drop.breakdown} />}
      </div>
      <button className="btn-white big" onClick={onBuy} disabled={poor || free <= 0}>
        {free <= 0 ? 'Нет свободных мест' : poor ? `Не хватает ${rub(lot.ask - coins)}` : `Купить за ${rub(lot.ask)}`}
      </button>
      <p className="note">
        Юз попадёт в коллекцию (нужно свободное место). Дальше его можно выставить на биржу по своей цене, комиссия при продаже 5%.
      </p>
      {drop && (
        <div>
          <div className="overline">Из чего цена</div>
          <PriceBreakdown breakdown={drop.breakdown} />
        </div>
      )}
    </div>
  );
}
