import { PLATFORMS, PLATFORM_ORDER } from '../game/platforms.js';
import { TIERS } from '../game/value.js';
import { fairPrice, saleChance, currentIndex, FEE } from '../game/market.js';
import Sparkline from '../components/Sparkline.jsx';
import { rubAt, rub, fmtDelta, fmtDuration } from '../format.js';
import PlatformMark from '../components/PlatformMark.jsx';

const PARTS = [
  { id: 'feed', label: 'Лента' },
  { id: 'mine', label: 'Мои лоты' },
  { id: 'offers', label: 'Офферы' },
  { id: 'news', label: 'Новости' },
  { id: 'prices', label: 'Цены' },
];

const infoOf = (l) => ({ platform: l.platform, tier: l.tier, base: l.base, cat: l.cat || null, short: l.name.length <= 4 });

// Как быстро продастся лот: по средней задержке покупателя
export function speedLabel(ask, fair, tier) {
  const mean = 1 / saleChance(ask, fair, tier); // минут
  if (!Number.isFinite(mean) || mean > 30 * 1440) return 'почти никогда не продастся';
  const text = mean < 30 ? 'очень быстро' : mean < 120 ? 'быстро' : mean < 480 ? 'средне' : mean < 1440 ? 'долго' : 'очень долго';
  return `${text} (≈ ${fmtDuration(mean * 60000)})`;
}

function Feed({ m, filter, onFilter, onOpenLot }) {
  const lots = m.lots.filter((l) => filter === 'all' || l.platform === filter);
  return (
    <>
      <div className="chips">
        <button className={filter === 'all' ? 'chip active' : 'chip'} onClick={() => onFilter('all')}>
          Все
        </button>
        {PLATFORM_ORDER.map((id) => (
          <button key={id} className={filter === id ? 'chip active' : 'chip'} onClick={() => onFilter(id)}>
            <PlatformMark id={id} /> {PLATFORMS[id].name}
          </button>
        ))}
      </div>
      {lots.length === 0 ? (
        <p className="note">Сейчас лотов этой платформы нет, загляни позже.</p>
      ) : (
        <div className="card">
          {lots.map((l) => {
            const ratio = l.ask / fairPrice(m, infoOf(l));
            return (
              <button className="coll-row lot" key={l.id} onClick={() => onOpenLot(l.id)}>
                <span className="dot" style={{ background: TIERS[l.tier].color }} />
                <span className="lot-main">
                  <span className="coll-name">@{l.name}</span>
                  <span className="lot-seller">
                    <PlatformMark id={l.platform} /> {l.seller}
                  </span>
                </span>
                <span className="lot-price">
                  {rub(l.ask)}
                  <span className={ratio <= 1 ? 'mult up' : 'mult down'}>{fmtDelta(ratio)} к рынку</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function Mine({ m, now, onUnlist, onGoCollection }) {
  return (
    <>
      <p className="note">
        Чтобы выставить юз, открой его в коллекции и нажми «Выставить на биржу». Комиссия биржи: {Math.round(FEE * 100)}%.
      </p>
      <button className="link" onClick={onGoCollection}>
        Открыть коллекцию →
      </button>
      {m.listings.length === 0 ? (
        <p className="note">У тебя нет активных лотов.</p>
      ) : (
        <div className="card">
          {m.listings.map((l) => {
            const fair = fairPrice(m, infoOf(l));
            return (
              <div className="coll-row" key={l.id}>
                <span className="dot" style={{ background: TIERS[l.tier].color }} />
                <span className="lot-main">
                  <span className="coll-name">@{l.name}</span>
                  <span className="lot-seller">
                    <PlatformMark id={l.platform} /> на бирже {fmtDuration(now - (l.at || now))} · {speedLabel(l.ask, fair, l.tier)}
                  </span>
                </span>
                <span className="lot-price">
                  {rub(l.ask)}
                  <span className="lot-seller">рынок {rub(fair)}</span>
                </span>
                <button className="claim" onClick={() => onUnlist(l.id)}>
                  Снять
                </button>
              </div>
            );
          })}
        </div>
      )}
      {m.log.length > 0 && (
        <div className="card">
          <div className="card-title">Недавние продажи</div>
          {m.log.slice(0, 8).map((x, i) => (
            <div className="stat-row" key={i}>
              <span>
                <PlatformMark id={x.platform} /> @{x.name} → {x.buyer}
              </span>
              <b>+{rub(x.price)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Offers({ m, now, onAccept, onDecline }) {
  if (!m.offers.length) {
    return <p className="note">Пока предложений нет. Покупатели присылают офферы на юзы из твоей коллекции — чем дороже юз, тем чаще.</p>;
  }
  return (
    <div className="card">
      {m.offers.map((o) => (
        <div className="task" key={o.id}>
          <div className="task-title">
            За @{o.name} <PlatformMark id={o.platform} /> предлагают {rubAt(o.price)}
          </div>
          <div className="task-reward">
            {o.buyer} · действует ещё {fmtDuration(o.until - now)}
          </div>
          <div className="actions two" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={() => onAccept(o.id)}>
              Принять
            </button>
            <button className="btn" onClick={() => onDecline(o.id)}>
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
      <div className="card">
        <div className="card-title">Сейчас на рынке</div>
        {m.events.length === 0 ? (
          <p className="note">Рынок спокоен, особых событий нет.</p>
        ) : (
          m.events.map((e) => (
            <div className="stat-row" key={e.id}>
              <span>{e.text}</span>
              <b className={e.mult >= 1 ? 'mult up' : 'mult down'}>ещё {fmtDuration(e.until - now)}</b>
            </div>
          ))
        )}
      </div>
      <div className="card">
        <div className="card-title">Лента новостей</div>
        {m.news.length === 0 ? (
          <p className="note">Новостей пока нет.</p>
        ) : (
          m.news.map((n) => (
            <div className="stat-row" key={n.id}>
              <span>{n.text}</span>
              <span className="lot-seller">{fmtDuration(now - n.t)} назад</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function IndexRow({ label, dot, values, now }) {
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
      <div className="card">
        <div className="card-title">По платформам</div>
        {PLATFORM_ORDER.map((p) => (
          <IndexRow
            key={p}
            label={`${PLATFORMS[p].icon} ${PLATFORMS[p].name}`}
            values={[...(m.hist.p[p] || []).slice(0, -1), currentIndex.platform(m, p)]}
          />
        ))}
      </div>
      <div className="card">
        <div className="card-title">По редкости</div>
        {TIERS.map((t, i) => (
          <IndexRow
            key={t.id}
            label={t.name}
            dot={t.color}
            values={[...(m.hist.t[i] || []).slice(0, -1), currentIndex.tier(m, i)]}
          />
        ))}
      </div>
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
  onOpenLot,
  onUnlist,
  onAccept,
  onDecline,
  onGoCollection,
}) {
  if (!market) return <div className="screen"><p className="note">Биржа открывается…</p></div>;
  return (
    <div className="screen">
      <div className="chips">
        {PARTS.map((p) => (
          <button key={p.id} className={part === p.id ? 'chip active' : 'chip'} onClick={() => onPart(p.id)}>
            {p.label}
            {p.id === 'offers' && market.offers.length > 0 && <span className="pill">{market.offers.length}</span>}
            {p.id === 'mine' && market.listings.length > 0 && <span className="pill">{market.listings.length}</span>}
          </button>
        ))}
      </div>
      {part === 'feed' && <Feed m={market} filter={filter} onFilter={onFilter} onOpenLot={onOpenLot} />}
      {part === 'mine' && <Mine m={market} now={now} onUnlist={onUnlist} onGoCollection={onGoCollection} />}
      {part === 'offers' && <Offers m={market} now={now} onAccept={onAccept} onDecline={onDecline} />}
      {part === 'news' && <News m={market} now={now} />}
      {part === 'prices' && <Prices m={market} />}
    </div>
  );
}
