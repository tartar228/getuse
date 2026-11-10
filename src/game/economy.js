// Числа экономики. Всё в одном месте, чтобы подкручивать на этапе баланса.
// На этапе 1 используются только START_COINS и цены действий после дропа.

import { PLATFORMS } from './platforms.js';

// Валюты. В кошельке лежат ₽ (целые числа) — это «рыночная» цена юзов в игре.
// @ — единица обмена: 1 @ = цена одной крутки. В интерфейсе рядом с ₽ пишем,
// сколько это в @ (в скобках). Реальных денег в игре нет.
export const CURRENCY = '₽';
export const SPIN_COST = 25; // ₽ за одну крутку = 1 @
export const AT_RATE = SPIN_COST; // курс: 1 @ = AT_RATE ₽

export const START_COINS = 1000;

// «Продать сразу» — быстрая продажа без биржи, с дисконтом от цены
export const SELL_RATE = 0.15;

// «Разобрать на монеты» — фиксированная сумма по тиру.
// Выгодно только для мусора, дорогие юзы лучше продавать.
export const SCRAP_FLAT = [4, 12, 40, 120, 350, 1000];

// Быстрая продажа не зависит от наценки платформы: премия Telegram/X достаётся только на бирже,
// иначе цикл «купил крутку, продал сразу» на этих платформах был бы выгодным.
export const sellValue = (drop) => Math.max(1, Math.floor((drop.price / PLATFORMS[drop.platform].priceMult) * SELL_RATE));
export const scrapValue = (drop) => SCRAP_FLAT[drop.tier];
