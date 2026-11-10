import { PLATFORMS } from '../game/platforms.js';

// Короткая метка платформы (TG, TT, IG, X, YT) вместо эмодзи: выглядит одинаково на всех телефонах
export default function PlatformMark({ id }) {
  return (
    <span className="pmark" aria-hidden="true">
      {PLATFORMS[id].icon}
    </span>
  );
}
