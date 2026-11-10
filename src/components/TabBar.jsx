import { useLayoutEffect, useRef, useState } from 'react';

// Плавающая капсула над низом экрана. Подложка активного пункта плавно переезжает между пунктами.
// Последний пункт — круглый аватар профиля.
export default function TabBar({ tabs, active, onSelect, avatar, avatarActive, onAvatar, badges = {} }) {
  const bar = useRef(null);
  const [ind, setInd] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = bar.current?.querySelector('[data-active="true"]');
      setInd(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(bar.current);
    return () => ro.disconnect();
  }, [active, avatarActive]);

  return (
    <nav className="tabbar" ref={bar}>
      {ind && (
        <span
          className="tab-pill"
          style={{ width: ind.w, height: ind.h, transform: `translate(${ind.x}px, ${ind.y}px)` }}
          aria-hidden="true"
        />
      )}
      {tabs.map((t) => (
        <button
          key={t.id}
          className={t.id === active ? 'tab active' : 'tab'}
          data-active={t.id === active}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {badges[t.id] > 0 && <span className="badge">{badges[t.id]}</span>}
        </button>
      ))}
      <button
        className={avatarActive ? 'tab avatar active' : 'tab avatar'}
        data-active={avatarActive}
        onClick={onAvatar}
        aria-label="Профиль"
      >
        {avatar}
      </button>
    </nav>
  );
}
