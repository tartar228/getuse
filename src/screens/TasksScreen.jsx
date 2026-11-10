import { useState } from 'react';
import {
  DAILY_TASKS,
  PERM_TASKS,
  ACHIEVEMENTS,
  progressOf,
  isClaimed,
  isClaimable,
} from '../game/tasks.js';
import { DAILY_REWARDS, rewardForStreak, bonusAvailable, formatReward } from '../game/daily.js';
import { fmt } from '../format.js';
import Icon from '../components/Icon.jsx';

function TaskRow({ def, state, items, onClaim }) {
  const progress = progressOf(def, state, items);
  const claimed = isClaimed(state, def.id);
  const claimable = isClaimable(def, state, items);
  return (
    <div className={`task ${progress >= def.target ? 'done' : ''}`}>
      <div className="task-top">
        <div>
          <div className="task-title">{def.title}</div>
          <div className="task-reward">
            {fmt(progress)} / {fmt(def.target)} · награда: {formatReward(def.reward)}
          </div>
        </div>
        {claimed ? (
          <span className="claimed">✓</span>
        ) : claimable ? (
          <button className="claim" onClick={() => onClaim(def.id)}>
            Забрать
          </button>
        ) : null}
      </div>
      <div className="bar">
        <i style={{ width: `${(progress / def.target) * 100}%` }} />
      </div>
    </div>
  );
}

export default function TasksScreen({ state, items, now, onClaim, onClaimDaily }) {
  const [part, setPart] = useState('tasks');
  const streak = state.daily.streak;
  const available = bonusAvailable(state, now);
  const todayIdx = (Math.max(1, streak) - 1) % DAILY_REWARDS.length;

  return (
    <div className="screen">
      <div className="seg">
        <button className={part === 'tasks' ? 'active' : ''} onClick={() => setPart('tasks')}>
          Задания
        </button>
        <button className={part === 'ach' ? 'active' : ''} onClick={() => setPart('ach')}>
          Достижения
        </button>
      </div>

      {part === 'tasks' ? (
        <>
          <div className="card">
            <div className="card-title">
              Ежедневный бонус · стрик {streak} <span className="streak-flame"><Icon name="flame" size={16} /></span>
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
                  {r.coins}
                  {r.spins ? ` +${r.spins}` : ''}
                </div>
              ))}
            </div>
            {available ? (
              <button className="btn primary" style={{ width: '100%' }} onClick={onClaimDaily}>
                Забрать бонус: {formatReward(rewardForStreak(streak))}
              </button>
            ) : (
              <p className="note">
                Сегодняшний бонус получен. Заходи завтра: {formatReward(rewardForStreak(streak + 1))}. Пропустишь
                день — стрик сбросится.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-title">Ежедневные</div>
            {DAILY_TASKS.map((d) => (
              <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
            ))}
          </div>

          <div className="card">
            <div className="card-title">Постоянные</div>
            {PERM_TASKS.map((d) => (
              <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
            ))}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-title">Достижения</div>
          {ACHIEVEMENTS.map((d) => (
            <TaskRow key={d.id} def={d} state={state} items={items} onClaim={onClaim} />
          ))}
        </div>
      )}
    </div>
  );
}
