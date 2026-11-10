import { PLATFORMS } from '../game/platforms.js';
import { rub, fmtDuration } from '../format.js';
import PlatformMark from './PlatformMark.jsx';

// Сводка рынка за время, пока игрока не было
export default function SummaryModal({ summary, onClose }) {
  const away = fmtDuration(summary.to - summary.from);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="h2">Пока тебя не было · {away}</h2>
        {summary.sold.length > 0 ? (
          <>
            <p className="note">
              Продано юзов: {summary.sold.length}, выручка <b>{rub(summary.earned)}</b> уже на балансе.
            </p>
            <div className="modal-list">
              {summary.sold.slice(0, 8).map((s, i) => (
                <div className="stat-row" key={i}>
                  <span>
                    <PlatformMark id={s.platform} /> @{s.name}
                  </span>
                  <b>+{rub(s.price)}</b>
                </div>
              ))}
              {summary.sold.length > 8 && <p className="note">…и ещё {summary.sold.length - 8}</p>}
            </div>
          </>
        ) : (
          <p className="note">Твои лоты за это время не продались.</p>
        )}
        {summary.newOffers > 0 && (
          <p className="note">Новых офферов на твои юзы: {summary.newOffers}. Они во вкладке «Биржа».</p>
        )}
        {summary.events.length > 0 && (
          <p className="note">
            На рынке были события: {summary.events.length}. Последнее: {summary.events[summary.events.length - 1]}
          </p>
        )}
        <button className="btn primary big" onClick={onClose}>
          Понятно
        </button>
      </div>
    </div>
  );
}
