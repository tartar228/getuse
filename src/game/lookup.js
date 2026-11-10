import { appraise } from './appraise.js';
import { PLATFORMS, PLATFORM_ORDER } from './platforms.js';

// «Пробив»: оценка любого введённого юза по тем же правилам, что и у выпавших.
// Юзы выдуманные и ни с какими настоящими аккаунтами не связаны, оценка игровая.

export const normalizeName = (raw) => raw.trim().replace(/^@+/, '').toLowerCase();

// Почему юз нельзя занять на платформе: null, если можно
export function nameProblem(name, platformId) {
  const p = PLATFORMS[platformId];
  if (!name) return 'Введи юз';
  if (name.length < p.minLen) return `Минимум ${p.minLen} симв.`;
  if (name.length > p.maxLen) return `Максимум ${p.maxLen} симв.`;
  if (!/^[a-z0-9._-]+$/.test(name)) return 'Только латиница, цифры и разделители';
  if (!p.validate(name)) return p.rules[1] || p.rules[0];
  return null;
}

// Оценка на выбранной платформе + цена на остальных платформах, где такой юз допустим
export function lookup(rawName, platformId) {
  const name = normalizeName(rawName);
  const problem = nameProblem(name, platformId);
  if (problem) return { name, problem };
  const others = PLATFORM_ORDER.filter((id) => id !== platformId && !nameProblem(name, id)).map((id) => ({
    platform: id,
    price: appraise(name, id).price,
  }));
  return { name, platform: platformId, ...appraise(name, platformId), others };
}
