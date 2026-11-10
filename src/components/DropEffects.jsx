import { useEffect, useMemo } from 'react';

// Эффекты выпадения нарастают с редкостью:
// Редкий: свечение рамки (чистый CSS); Эпический: вспышка-кольцо;
// Легендарный: кольцо, конфетти, затемнение экрана; Мифический: ещё и тряска, больше конфетти.
// Рисуются один раз при раскрытии (`playId`), prefers-reduced-motion отключает движение в CSS.
const COUNT = { 4: 26, 5: 48 };
const SPARK = ['#ffffff', '#ffc247'];

export default function DropEffects({ tier, color, playId }) {
  const particles = useMemo(() => {
    const n = COUNT[tier] || 0;
    return Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 90 + Math.random() * (tier >= 5 ? 170 : 120);
      return {
        dx: Math.round(Math.cos(angle) * dist),
        dy: Math.round(Math.sin(angle) * dist * 0.8 - 30),
        rot: Math.round(Math.random() * 540 - 270),
        delay: Math.round(Math.random() * 120),
        size: 5 + Math.round(Math.random() * 5),
        color: i % 3 === 0 ? color : SPARK[i % 2],
      };
    });
  }, [playId]);

  useEffect(() => {
    if (tier < 5) return undefined;
    const root = document.documentElement;
    root.classList.add('fx-shake');
    const t = setTimeout(() => root.classList.remove('fx-shake'), 650);
    return () => {
      clearTimeout(t);
      root.classList.remove('fx-shake');
    };
  }, [playId, tier]);

  if (tier < 3) return null;
  return (
    <>
      <span className="fx-ring" aria-hidden="true" />
      {tier >= 5 && <span className="fx-ring second" aria-hidden="true" />}
      {particles.length > 0 && (
        <span className="fx-burst" aria-hidden="true">
          {particles.map((p, i) => (
            <i
              key={i}
              style={{
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--rot': `${p.rot}deg`,
                width: p.size,
                height: p.size * 1.6,
                background: p.color,
                animationDelay: `${p.delay}ms`,
              }}
            />
          ))}
        </span>
      )}
      {tier >= 4 && <span className="fx-dim" aria-hidden="true" />}
    </>
  );
}
