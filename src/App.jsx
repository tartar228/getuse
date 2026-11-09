import { useCallback, useEffect, useRef, useState } from 'react';
import SpinScreen from './screens/SpinScreen.jsx';
import OddsScreen from './screens/OddsScreen.jsx';
import CollectionScreen from './screens/CollectionScreen.jsx';
import StubScreen from './screens/StubScreen.jsx';
import { rollDrop } from './game/generator.js';
import { TIERS } from './game/value.js';
import { START_COINS, sellValue, scrapValue } from './game/economy.js';
import { APP_TITLE } from './config.js';
import { backButton, haptic, isTelegram } from './telegram.js';
import { rub, fmtAt } from './format.js';

const TABS = [
  { id: 'spin', label: 'Крутить', icon: '🎰' },
  { id: 'collection', label: 'Коллекция', icon: '🗂' },
  { id: 'market', label: 'Биржа', icon: '📈' },
  { id: 'tasks', label: 'Задания', icon: '✅' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
];

const emptyStats = () => ({ spins: 0, tiers: TIERS.map(() => 0) });

export default function App() {
  const [tab, setTab] = useState('spin');
  const [view, setView] = useState(null); // подэкран поверх вкладки, например 'odds'
  const [platform, setPlatform] = useState('telegram');
  const [coins, setCoins] = useState(START_COINS);
  const [collection, setCollection] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  // дроп, по которому игрок ещё не принял решение. Живёт в App, чтобы не потеряться
  // при переключении вкладок
  const [current, setCurrent] = useState(null);

  const spin = () => {
    if (current) return;
    const drop = rollDrop(platform);
    setCurrent({ drop, revealed: false });
    setStats((s) => ({
      spins: s.spins + 1,
      tiers: s.tiers.map((n, i) => (i === drop.tier ? n + 1 : n)),
    }));
  };

  const onRevealed = useCallback(() => {
    setCurrent((c) => (c && !c.revealed ? { ...c, revealed: true } : c));
    if (current?.drop.tier >= 3) haptic.success();
    else haptic.thud();
  }, [current?.drop.tier]);

  const decide = (kind) => {
    if (!current?.revealed) return;
    const d = current.drop;
    if (kind === 'keep') setCollection((c) => [d, ...c]);
    if (kind === 'sell') setCoins((c) => c + sellValue(d));
    if (kind === 'scrap') setCoins((c) => c + scrapValue(d));
    haptic.select();
    setCurrent(null);
  };

  // ---------- навигация и кнопка «Назад» ----------
  const goBack = useCallback(() => {
    if (view) setView(null);
    else setTab('spin');
  }, [view]);

  const canGoBack = Boolean(view) || tab !== 'spin';

  useEffect(() => {
    if (canGoBack) backButton.show(goBack);
    else backButton.hide();
    return () => backButton.hide();
  }, [canGoBack, goBack]);

  const openTab = (id) => {
    haptic.select();
    setView(null);
    setTab(id);
  };

  let body;
  if (view === 'odds') {
    body = <OddsScreen platform={platform} />;
  } else if (tab === 'spin') {
    body = (
      <SpinScreen
        platform={platform}
        onPlatform={setPlatform}
        current={current}
        onSpin={spin}
        onRevealed={onRevealed}
        onDecide={decide}
        stats={stats}
        onOdds={() => setView('odds')}
      />
    );
  } else if (tab === 'collection') {
    body = <CollectionScreen collection={collection} />;
  } else if (tab === 'market') {
    body = <StubScreen title="Биржа" stage={4} text="Лента лотов, свои объявления, офферы и новости рынка." />;
  } else if (tab === 'tasks') {
    body = <StubScreen title="Задания" stage={3} text="Ежедневные и постоянные задания, достижения." />;
  } else {
    body = <StubScreen title="Профиль" stage={2} text="Витрина лучших юзов и стоимость коллекции." />;
  }

  return (
    <div className="app">
      <header className="topbar">
        {!isTelegram && canGoBack && (
          <button className="back" onClick={goBack} aria-label="Назад">
            ←
          </button>
        )}
        <div className="title">{APP_TITLE}</div>
        <div className="balance">
          <span title="Баланс">{rub(coins)} <small className="at">{fmtAt(coins)}</small></span>
          <span title="Крутки (на этапе 1 без лимита)">🎟 ∞</span>
        </div>
      </header>

      <main className="content">{body}</main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab && !view ? 'tab active' : 'tab'}
            onClick={() => openTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
