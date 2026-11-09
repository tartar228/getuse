import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import SpinScreen from './screens/SpinScreen.jsx';
import OddsScreen from './screens/OddsScreen.jsx';
import CollectionScreen, { DEFAULT_FILTER } from './screens/CollectionScreen.jsx';
import ItemScreen from './screens/ItemScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import TasksScreen from './screens/TasksScreen.jsx';
import ExchangeScreen from './screens/ExchangeScreen.jsx';
import LotScreen from './screens/LotScreen.jsx';
import ListScreen from './screens/ListScreen.jsx';
import SummaryModal from './components/SummaryModal.jsx';
import { rollDrop } from './game/generator.js';
import { hydrate } from './game/appraise.js';
import { initialState, reducer } from './state/game.js';
import { loadState, saveState, flushNow } from './state/persist.js';
import { shareDrop } from './share.js';
import { APP_TITLE } from './config.js';
import { backButton, haptic, isTelegram } from './telegram.js';
import { rub, fmtAt, fmtTime } from './format.js';
import { FREE_CAP, nextSpinIn, buyPrice } from './game/spins.js';
import { claimableCount } from './game/tasks.js';
import { bonusAvailable } from './game/daily.js';

const TABS = [
  { id: 'spin', label: 'Крутить', icon: '🎰' },
  { id: 'collection', label: 'Коллекция', icon: '🗂' },
  { id: 'market', label: 'Биржа', icon: '📈' },
  { id: 'tasks', label: 'Задания', icon: '✅' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('spin');
  // подэкран поверх вкладки: 'odds' или { item: id }
  const [view, setView] = useState(null);
  const [platform, setPlatform] = useState('telegram');
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  // id дропа, анимация которого уже доиграла (или который восстановлен из сохранения)
  const [revealedId, setRevealedId] = useState(null);
  const [exPart, setExPart] = useState('feed'); // раздел биржи
  const [exFilter, setExFilter] = useState('all'); // платформа в ленте лотов
  // текущее время: обновляется раз в секунду для таймера и сброса дня
  const [now, setNow] = useState(() => Date.now());

  // ---------- загрузка и сохранение ----------
  useEffect(() => {
    let alive = true;
    loadState().then((saved) => {
      if (!alive) return;
      dispatch({ type: 'load', state: saved, now: Date.now() });
      if (saved?.pending) setRevealedId(saved.pending.id);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  // тикер: докручивает крутки, следит за сменой дня. Когда игру сворачивали,
  // таймеры браузера замирают, но при возврате первый же тик досчитает накопленное
  useEffect(() => {
    if (!loaded) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'tick', now: t });
    }, 1000);
    return () => clearInterval(id);
  }, [loaded]);

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flushNow();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

  // ---------- производные данные ----------
  const items = useMemo(() => state.collection.map(hydrate), [state.collection]);
  const pendingDrop = useMemo(() => (state.pending ? hydrate(state.pending) : null), [state.pending]);
  const badge = loaded ? claimableCount(state, items) + (bonusAvailable(state, now) ? 1 : 0) : 0;
  const nextIn = nextSpinIn(state, now);
  const current = pendingDrop ? { drop: pendingDrop, revealed: revealedId === pendingDrop.id } : null;

  // ---------- действия ----------
  const spin = () => {
    if (state.pending) return;
    dispatch({ type: 'spin', drop: rollDrop(platform), now: Date.now() });
  };

  const onRevealed = useCallback(() => {
    if (!state.pending) return;
    setRevealedId(state.pending.id);
    if (pendingDrop.tier >= 3) haptic.success();
    else haptic.thud();
  }, [state.pending, pendingDrop]);

  const buySpins = (count) => {
    haptic.select();
    dispatch({ type: 'buySpins', count, now: Date.now() });
  };

  const claim = (id) => {
    haptic.success();
    dispatch({ type: 'claim', id, now: Date.now() });
  };

  const claimDaily = () => {
    haptic.success();
    dispatch({ type: 'claimDaily', now: Date.now() });
  };

  const market = state.market;

  const listItem = (id, ask) => {
    haptic.success();
    dispatch({ type: 'listItem', id, ask, now: Date.now() });
    setView(null);
    setExPart('mine');
    setTab('market');
  };

  const buyLot = (id) => {
    haptic.success();
    dispatch({ type: 'buyLot', id, now: Date.now() });
    setView(null);
  };

  const exAction = (type) => (id) => {
    haptic.select();
    dispatch({ type, id, now: Date.now() });
  };

  const decide = (kind) => {
    if (!current?.revealed) return;
    haptic.select();
    dispatch({ type: 'decide', kind });
  };

  const itemAction = (type, id) => {
    haptic.select();
    dispatch({ type, id });
    setView(null);
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

  const openItem = (id) => setView({ item: id });

  let body;
  if (!loaded) {
    body = <div className="screen"><p className="note">Загрузка…</p></div>;
  } else if (view === 'odds') {
    body = <OddsScreen platform={platform} />;
  } else if (view?.lot) {
    const lot = market?.lots.find((l) => l.id === view.lot);
    body = (
      <LotScreen
        lot={lot}
        drop={lot ? hydrate({ id: lot.id, name: lot.name, platform: lot.platform, ts: lot.ts }) : null}
        market={market}
        coins={state.coins}
        onBuy={() => buyLot(view.lot)}
      />
    );
  } else if (view?.list) {
    body = (
      <ListScreen
        key={view.list}
        drop={items.find((d) => d.id === view.list)}
        market={market}
        onList={(ask) => listItem(view.list, ask)}
      />
    );
  } else if (view?.item) {
    body = (
      <ItemScreen
        drop={items.find((d) => d.id === view.item)}
        onSell={() => itemAction('sellItem', view.item)}
        onScrap={() => itemAction('scrapItem', view.item)}
        onShare={shareDrop}
        onList={() => setView({ list: view.item })}
      />
    );
  } else if (tab === 'spin') {
    body = (
      <SpinScreen
        platform={platform}
        onPlatform={setPlatform}
        current={current}
        onSpin={spin}
        onRevealed={onRevealed}
        onDecide={decide}
        onShare={shareDrop}
        lifetime={state.lifetime}
        onOdds={() => setView('odds')}
        spins={state.spins}
        nextIn={nextIn}
        coins={state.coins}
        buy1={buyPrice(state, now, 1)}
        buy5={buyPrice(state, now, 5)}
        onBuy={buySpins}
      />
    );
  } else if (tab === 'collection') {
    body = <CollectionScreen items={items} filter={filter} onFilter={setFilter} onOpen={openItem} />;
  } else if (tab === 'market') {
    body = (
      <ExchangeScreen
        market={market}
        now={now}
        part={exPart}
        onPart={setExPart}
        filter={exFilter}
        onFilter={setExFilter}
        onOpenLot={(id) => setView({ lot: id })}
        onUnlist={exAction('unlist')}
        onAccept={exAction('acceptOffer')}
        onDecline={exAction('declineOffer')}
        onGoCollection={() => openTab('collection')}
      />
    );
  } else if (tab === 'tasks') {
    body = (
      <TasksScreen state={state} items={items} now={now} onClaim={claim} onClaimDaily={claimDaily} />
    );
  } else {
    body = (
      <ProfileScreen
        items={items}
        coins={state.coins}
        lifetime={state.lifetime}
        onOpen={openItem}
        onShare={shareDrop}
      />
    );
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
          <span title="Баланс">
            {rub(state.coins)} <small className="at">{fmtAt(state.coins)}</small>
          </span>
          <span title="Крутки">
            🎟 {state.spins}
            {state.spins < FREE_CAP && <small className="timer">/{FREE_CAP}</small>}
            {nextIn !== null && <small className="timer"> · {fmtTime(nextIn)}</small>}
          </span>
        </div>
      </header>

      <main className="content">{body}</main>

      {loaded && market?.summary && (
        <SummaryModal summary={market.summary} onClose={() => dispatch({ type: 'dismissSummary' })} />
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab && !view ? 'tab active' : 'tab'}
            onClick={() => openTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === 'tasks' && badge > 0 && <span className="badge">{badge}</span>}
            {t.id === 'market' && market && market.offers.length > 0 && (
              <span className="badge">{market.offers.length}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
