import Icon from './Icon.jsx';
import Num from './Num.jsx';
import { fmtLuck, fmtThin } from '../format.js';

// Шапка: слева баланс и крутки (тап по молнии открывает шторку с таймером и покупкой),
// под ними мелко удача; справа иконки-контуры: пробив и задания с красным счётчиком.
export default function Header({ coins, spins, cap, luck, badge, back, onBack, onSpins, onSearch, onTasks }) {
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn ghost" onClick={onBack} aria-label="Назад">
          <Icon name="back" size={20} />
        </button>
      )}
      <div className="hbal">
        <div className="hbal-row">
          <span className="hbal-coins">
            <Num value={coins} duration={500} />
            <small> ₽</small>
          </span>
          <button className="hbal-spins" onClick={onSpins} aria-label={`Крутки: ${spins}`}>
            <Icon name="bolt" size={15} />
            {fmtThin(spins)}
            {spins < cap && <small>/{cap}</small>}
          </button>
        </div>
        <div className="hbal-luck">Удача {fmtLuck(luck)}</div>
      </div>
      <div className="hicons">
        <button className="icon-btn" onClick={onSearch} aria-label="Пробить юз">
          <Icon name="search" size={20} />
        </button>
        <button className="icon-btn" onClick={onTasks} aria-label="Задания">
          <Icon name="tasks" size={20} />
          {badge > 0 && <span className="badge dot-badge">{badge}</span>}
        </button>
      </div>
    </header>
  );
}
