import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { fairPrice, saleChance, currentIndex, FEE } from '../game/market.js';
import Sparkline from '../components/Sparkline.jsx';
import Icon from '../components/Icon.jsx';
import { fmtAt, fmtDelta, fmtDuration, fmtThin } from '../format.js';

const PARTS = [
  { id: 'feed', label: 'Лента' },
  { id: 'mine', label: 'Мои лоты' },
  { id: 'offers', label: 'Офферы' },
  { id: 'news', label: 'Новости' },
  { id: 'prices', label: 'Цены' },
];

const infoOf = (l) => ({ platform: l.platform, tier: l.tier, base: l.base, cat: l.cat || null, short: l.name.length <= 4 });
const shortName = (id) => PLATFORMS[id].name.replace(' (Twitter)', '');

// Как быстро продастся лот: по средней задержке покупателя
export function speedLabel(ask, fair, tier) {
  const mean = 1 / saleChance(ask, fair, tier); // минут
  if (!Number.isFinite(mean) || mean > 30 * 1440) return 'почти никогда не продастся';
  const text = mean < 30 ? 'очень быстро' : mean < 120 ? 'быстро' : mean < 480 ? 'средне' : mean < 1440 ? 'долго' : 'очень долго';
  return `${text} (≈ ${fmtDuration(mean * 60000)})`;
}

// Цена в ₽ с эквивалентом в @ в скобках, под ней дополнительная строка
function PriceCell({ value, extra }) {
  return (
    <span className="crow-price">
      {fmtThin(value)} ₽<small>({fmtAt(value)})</small>
      {extra}
    </span>
  );
}

function NickLine({ tier, platform, name }) {
  return (
    <>
      <span className="rtier" style={{ color: TIERS[tier].color }}>
        <span className="rdot" style={{ background: TIERS[tier].color }} />
        {TIERS[tier].name}
      </span>
      <span className="rnick">
        <Icon name={platform} size={14} />@{name}
      </span>
    </>
  );
}

function Feed({ m, filter, onFilter, onOpenLot }) {
  const lots = m.lots.filter((l) => filter === 'all' || l.platform === filter);
  return (
    <>
      <div className="seg-row scroll">
        <button className={filter === 'all' ? 'seg-pill active' : 'seg-pill'} onClick={() => onFilter('all')}>
          Все
        </button>
        {PLATFORM_ORDER.map((id) => (
          <button key={id} className={filter === id ? 'seg-pill active' : 'seg-pill'} onClick={() => onFilter(id)}>
            {shortName(id)}
          </button>
        ))}
      </div>
      {lots.length === 0 ? (
        <p className="note">Сейчас лотов этой платформы нет, загляни позже.</p>
      ) : (
        <div className="plain-list">
          {lots.map((l) => {
            const ratio = l.ask / fairPrice(m, infoOf(l));
            return (
              <button className="crow lot" key={l.id} onClick={() => onOpenLot(l.id)}>
                <span className="crow-main">
                  <NickLine tier={l.tier} platform={l.platform} name={l.name} />
                  <span className="lot-seller">{l.seller}</span>
                </span>
                <PriceCell
                  value={l.ask}
                  extra={<em className={ratio <= 1 ? 'delta up' : 'delta down'}>{fmtDelta(ratio)} к рынку</em>}
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function Mine({ m, now, free, onUnlist, onGoCollection }) {
  return (
    <>
      <p className="note">
        Чтобы выставить юз, открой его в коллекции и нажми «На биржу». Комиссия биржи: {Math.round(FEE * 100)}%.
      </p>
      <button className="link left" onClick={onGoCollection}>
        Открыть коллекцию
      </button>
      {m.listings.length === 0 ? (
        <p className="note">У тебя нет активных лотов.</p>
      ) : (
        <div className="plain-list">
          {m.listings.map((l) => {
            const fair = fairPrice(m, infoOf(l));
            return (
              <div className="crow" key={l.id}>
                <span className="crow-main">
                  <NickLine tier={l.tier} platform={l.platform} name={l.name} />
                  <span className="lot-seller">
                    на бирже {fmtDuration(now - (l.at || now))} · {speedLabel(l.ask, fair, l.tier)}
                  </span>
                </span>
                <PriceCell value={l.ask} extra={<em className="delta">рынок {fmtThin(fair)} ₽</em>} />
                <button className="mini-btn" disabled={free <= 0} onClick={() => onUnlist(l.id)}>
                  {free > 0 ? 'Снять' : 'Нет мест'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {m.log.length > 0 && (
        <section>
          <div className="overline">Недавние продажи</div>
          <div className="plain-list">
            {m.log.slice(0, 8).map((x, i) => (
              <div className="stat-row" key={i}>
                <span>
                  <Icon name={x.platform} size={14} /> @{x.name} → {x.buyer}
                </span>
                <b>+{fmtThin(x.price)} ₽</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Offers({ m, now, onAccept, onDecline }) {
  if (!m.offers.length) {
    return <p className="note">Пока предложений нет. Покупатели присылают офферы на юзы из твоей коллекции: чем дороже юз, тем чаще.</p>;
  }
  return (
    <div className="plain-list">
      {m.offers.map((o) => (
        <div className="offer" key={o.id}>
          <div className="offer-top">
            <span className="rnick">
              <Icon name={o.platform} size={14} />@{o.name}
            </span>
            <span className="crow-price">
              {fmtThin(o.price)} ₽<small>({fmtAt(o.price)})</small>
            </span>
          </div>
          <div className="lot-seller">
            {o.buyer} · действует ещё {fmtDuration(o.until - now)}
          </div>
          <div className="offer-act">
            <button className="mini-btn white" onClick={() => onAccept(o.id)}>
              Принять
            </button>
            <button className="mini-btn" onClick={() => onDecline(o.id)}>
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function News({ m, now }) {
  return (
    <>
      <section>
        <div className="overline">Сейчас на рынке</div>
        {m.events.length === 0 ? (
          <p className="note">Рынок спокоен, особых событий нет.</p>
        ) : (
          <div className="plain-list">
            {m.events.map((e) => (
              <div className="stat-row" key={e.id}>
                <span>{e.text}</span>
                <b className={e.mult >= 1 ? 'mult up' : 'mult down'}>ещё {fmtDuration(e.until - now)}</b>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <div className="overline">Лента новостей</div>
        {m.news.length === 0 ? (
          <p className="note">Новостей пока нет.</p>
        ) : (
          <div className="plain-list">
            {m.news.map((n) => (
              <div className="stat-row" key={n.id}>
                <span>{n.text}</span>
                <span className="lot-seller">{fmtDuration(now - n.t)} назад</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function IndexRow({ label, dot, values }) {
  const cur = values[values.length - 1];
  const prev = values[Math.max(0, values.length - 7)];
  const diff = cur - prev;
  return (
    <div className="idx-row">
      <span className="idx-name">
        {dot && <span className="dot" style={{ background: dot }} />} {label}
      </span>
      <Sparkline values={values} />
      <span className="idx-val">
        {cur}
        <small className={diff >= 0 ? 'mult up' : 'mult down'}> {diff >= 0 ? '+' : '−'}{Math.abs(diff)}</small>
      </span>
    </div>
  );
}

function Prices({ m }) {
  return (
    <>
      <p className="note">Индекс цены: 100 — норма. График за последние ~12 часов, изменение — за последний час.</p>
      <section>
        <div className="overline">По платформам</div>
        <div className="plain-list">
          {PLATFORM_ORDER.map((p) => (
            <IndexRow
              key={p}
              label={shortName(p)}
              values={[...(m.hist.p[p] || []).slice(0, -1), currentIndex.platform(m, p)]}
            />
          ))}
        </div>
      </section>
      <section>
        <div className="overline">По редкости</div>
        <div className="plain-list">
          {TIERS.map((t, i) => (
            <IndexRow key={t.id} label={t.name} dot={t.color} values={[...(m.hist.t[i] || []).slice(0, -1), currentIndex.tier(m, i)]} />
          ))}
        </div>
      </section>
    </>
  );
}

export default function ExchangeScreen({
  market,
  now,
  part,
  onPart,
  filter,
  onFilter,
  free,
  onOpenLot,
  onUnlist,
  onAccept,
  onDecline,
  onGoCollection,
}) {
  if (!market) return <div className="screen"><p className="note">Биржа открывается…</p></div>;
  return (
    <div className="screen ex">
      <div className="titlebar">
        <h1 className="display">Биржа</h1>
      </div>
      <div className="seg-row scroll">
        {PARTS.map((p) => (
          <button key={p.id} className={part === p.id ? 'seg-pill active' : 'seg-pill'} onClick={() => onPart(p.id)}>
            {p.label}
            {p.id === 'offers' && market.offers.length > 0 && <span className="pill">{market.offers.length}</span>}
            {p.id === 'mine' && market.listings.length > 0 && <span className="pill">{market.listings.length}</span>}
          </button>
        ))}
      </div>
      {part === 'feed' && <Feed m={market} filter={filter} onFilter={onFilter} onOpenLot={onOpenLot} />}
      {part === 'mine' && <Mine m={market} now={now} free={free} onUnlist={onUnlist} onGoCollection={onGoCollection} />}
      {part === 'offers' && <Offers m={market} now={now} onAccept={onAccept} onDecline={onDecline} />}
      {part === 'news' && <News m={market} now={now} />}
      {part === 'prices' && <Prices m={market} />}
    </div>
  );
}
