import Icon from './Icon.jsx';
import Num from './Num.jsx';
import { fmtAt, fmtLuck, fmtTime } from '../format.js';

// Шапка: баланс в ₽ и в скобках в @ (на @ крутим), под ним удача и время до подзарядки;
// тап по балансу открывает шторку про @. Справа иконки: пробив и задания.
// В полном экране баланс уходит в полосу Telegram сверху и стоит по центру.
export default function Header({ coins, luck, nextIn, badge, back, onBack, onBalance, onSearch, onTasks }) {
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn ghost" onClick={onBack} aria-label="Назад">
          <Icon name="back" size={20} />
        </button>
      )}
      <button className="hbal" onClick={onBalance} aria-label="Баланс и подзарядка @">
        <span className="hbal-coins">
          <Num value={coins} duration={500} />
          <small> ₽ ({fmtAt(coins)})</small>
        </span>
        <span className="hbal-luck">
          Удача {fmtLuck(luck)}
          {nextIn !== null && <> · +1 @ через {fmtTime(nextIn)}</>}
        </span>
      </button>
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
