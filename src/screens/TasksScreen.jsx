import { useState } from 'react';
import {
  DAILY_TASKS,
  PERM_TASKS,
  ACHIEVEMENTS,
  progressOf,
  isClaimed,
  isClaimable,
} from '../game/tasks.js';
import { DAILY_REWARDS, rewardForStreak, rewardCoins, bonusAvailable, formatReward } from '../game/daily.js';
import { fmt } from '../format.js';
import Icon from '../components/Icon.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

// 1500 → 1,5к, чтобы награда за день влезла в ячейку
const compact = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}к`.replace('.', ',') : String(n));

function TaskRow({ def, state, items, onClaim }) {
  const progress = progressOf(def, state, items);
  const claimed = isClaimed(state, def.id);
  const claimable = isClaimable(def, state, items);
  return (
    <div className={progress >= def.target ? 'trow done' : 'trow'}>
      <div className="trow-top">
        <div className="trow-main">
          <div className="task-title">{def.title}</div>
          <div className="task-reward">{formatReward(def.reward)}</div>
        </div>
        {claimed ? (
          <span className="claimed" aria-label="Награда получена">
            <Icon name="verified" size={22} />
          </span>
        ) : claimable ? (
          <button className="mini-btn white" onClick={() => onClaim(def.id)}>
            Забрать
          </button>
        ) : (
          <span className="trow-count">
            {fmt(progress)}/{fmt(def.target)}
          </span>
        )}
      </div>
      <ProgressBar value={progress} max={def.target} label={def.title} />
    </div>
  );
}

export default function TasksScreen({ state, items, now, onClaim, onClaimDaily }) {
  const [part, setPart] = useState('tasks');
  const streak = state.daily.streak;
  const available = bonusAvailable(state, now);
  const todayIdx = (Math.max(1, streak) - 1) % DAILY_REWARDS.length;

  return (
    <div className="screen tasks">
      <div className="seg-row">
        <button className={part === 'tasks' ? 'seg-pill active' : 'seg-pill'} onClick={() => setPart('tasks')}>
          Задания
        </button>
        <button className={part === 'ach' ? 'seg-pill active' : 'seg-pill'} onClick={() => setPart('ach')}>
          Достижения
        </button>
      </div>

      {part === 'tasks' ? (
        <>
          <section>
            <div className="overline-row">
              <span className="overline">Ежедневный бонус</span>
              <span className="streak-line">
                <Icon name="flame" size={14} /> стрик {streak}
              </span>
            </div>
            <div className="streak-days">
              {DAILY_REWARDS.map((r, i) => (
                <div
                  key={i}
                  className={`streak-day ${i < todayIdx || (i === todayIdx && !available) ? 'done' : ''} ${
                    i === todayIdx ? 'today' : ''
                  }`}
                >
                  <b>{i + 1}</b>
                  {compact(rewardCoins(r))}
                </div>
              ))}
            </div>
            {available ? (
              <button className="btn-white big" onClick={onClaimDaily}>
                Забрать бонус: {formatReward(rewardForStreak(streak))}
              </button>
            ) : (
              <p className="note">
                Сегодняшний бонус получен. Заходи завтра: {formatReward(rewardForStreak(streak + 1))}. Пропустишь день, стрик
                сбросится.
              </p>
            )}
          </section>

          <section>
            <div className="overline">Ежедневные</div>
            {DAILY_TASKS.map((d) => (
              <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
            ))}
          </section>

          <section>
            <div className="overline">Постоянные</div>
            {PERM_TASKS.map((d) => (
              <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
            ))}
          </section>
        </>
      ) : (
        <section>
          <div className="overline">Достижения</div>
          {ACHIEVEMENTS.map((d) => (
            <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
          ))}
        </section>
      )}
    </div>
  );
}
