import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import SpinScreen from './screens/SpinScreen.jsx';
import OddsScreen from './screens/OddsScreen.jsx';
import LookupScreen from './screens/LookupScreen.jsx';
import CollectionScreen, { DEFAULT_FILTER } from './screens/CollectionScreen.jsx';
import ItemScreen from './screens/ItemScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import TasksScreen from './screens/TasksScreen.jsx';
import ExchangeScreen from './screens/ExchangeScreen.jsx';
import LotScreen from './screens/LotScreen.jsx';
import ListScreen from './screens/ListScreen.jsx';
import SummaryModal from './components/SummaryModal.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import Toasts from './components/Toasts.jsx';
import UserAvatar from './components/UserAvatar.jsx';
import Icon from './components/Icon.jsx';
import { rollDrop } from './game/generator.js';
import { hydrate } from './game/appraise.js';
import { initialState, reducer, capacity, freeSlots } from './state/game.js';
import { loadState, saveState, flushNow } from './state/persist.js';
import { shareDrop } from './share.js';
import { backButton, haptic, isTelegram } from './telegram.js';
import { rub, fmtAt, fmtThin, fmtTime } from './format.js';
import { nextSpinIn, buyPrice, capOf, intervalOf } from './game/spins.js';
import { claimableCount } from './game/tasks.js';
import { bonusAvailable, formatReward } from './game/daily.js';
import { levelOf, levelReward, nextPerk, perksOfLevel, slotPrice } from './game/levels.js';
import { luckOf } from './game/talismans.js';
import { sellValue } from './game/economy.js';

const TABS = [
  { id: 'spin', label: 'Крутить' },
  { id: 'collection', label: 'Коллекция' },
  { id: 'market', label: 'Биржа' },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('spin');
  // подэкран поверх вкладки: 'odds', 'lookup' или { item | lot | list: id }
  const [view, setView] = useState(null);
  // шторка поверх экрана: 'tasks' или 'spins'
  const [sheet, setSheet] = useState(null);
  const [platform, setPlatform] = useState('telegram');
  const [count, setCount] = useState(1); // сколько круток за раз: 1, 2, 3 или 5
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  // анимация раскрытия текущей пачки дропов доиграла (или она восстановлена из сохранения)
  const [revealed, setRevealed] = useState(false);
  const [exPart, setExPart] = useState('feed'); // раздел биржи
  const [exFilter, setExFilter] = useState('all'); // платформа в ленте лотов
  const [toasts, setToasts] = useState([]);
  // текущее время: обновляется раз в секунду для таймера и сброса дня
  const [now, setNow] = useState(() => Date.now());

  const toast = useCallback((text, title) => {
    const id = `${Date.now()}${Math.random()}`;
    setToasts((t) => [...t.slice(-2), { id, text, title }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ---------- загрузка и сохранение ----------
  useEffect(() => {
    let alive = true;
    loadState().then((saved) => {
      if (!alive) return;
      dispatch({ type: 'load', state: saved, now: Date.now() });
      if (saved?.pending) setRevealed(true);
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
  const pending = useMemo(() => (state.pending ? state.pending.map(hydrate) : null), [state.pending]);
  const luck = useMemo(() => luckOf(state), [state.talismans, state.collection]);
  const badge = loaded ? claimableCount(state, items) + (bonusAvailable(state, now) ? 1 : 0) : 0;
  const nextIn = nextSpinIn(state, now);
  const level = useMemo(() => {
    const l = levelOf(state.xp);
    return { ...l, next: nextPerk(l.level) };
  }, [state.xp]);
  const free = freeSlots(state);
  const cap = capOf(state);

  // новый уровень: тост с наградой и ништяками (если сразу несколько уровней, то суммарно)
  const seenLevel = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const prev = seenLevel.current;
    if (prev !== null && state.levelClaimed > prev) {
      let coins = 0;
      let spins = 0;
      const perks = [];
      for (let l = prev + 1; l <= state.levelClaimed; l++) {
        coins += levelReward(l).coins;
        spins += levelReward(l).spins;
        perks.push(...perksOfLevel(l));
      }
      toast([formatReward({ coins, spins }), ...perks].join(' · '), `Уровень ${state.levelClaimed}`);
      haptic.success();
    }
    seenLevel.current = state.levelClaimed;
  }, [state.levelClaimed, loaded, toast]);

  // ---------- действия ----------
  const spin = (n) => {
    if (state.pending) return;
    haptic.select();
    const drops = Array.from({ length: n }, () => rollDrop(platform, Math.random, luck));
    setRevealed(false);
    dispatch({ type: 'spin', drops, now: Date.now() });
  };

  const onRevealed = useCallback(() => {
    if (!pending) return;
    setRevealed(true);
    const top = Math.max(...pending.map((d) => d.tier));
    if (top >= 4) {
      haptic.thud();
      setTimeout(haptic.success, 160);
      if (top >= 5) setTimeout(haptic.thud, 320);
    } else if (top >= 3) haptic.success();
    else haptic.thud();
  }, [pending]);

  const buySpins = (n) => {
    haptic.select();
    dispatch({ type: 'buySpins', count: n, now: Date.now() });
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

  const decide = (id, kind) => {
    const d = pending?.find((x) => x.id === id);
    if (!d || !revealed) return;
    haptic.select();
    if (kind === 'sell') toast(`+${fmtThin(sellValue(d))} ₽ (${fmtAt(sellValue(d))})`, 'Продано');
    if (kind === 'scrap') toast('Разобран на запчасти');
    dispatch({ type: 'decide', id, kind });
  };

  const decideAll = (kind) => {
    if (!pending || !revealed) return;
    haptic.success();
    toast(`+${fmtThin(pending.reduce((s, d) => s + sellValue(d), 0))} ₽`, `Продано: ${pending.length}`);
    dispatch({ type: 'decideAll', kind });
  };

  const itemAction = (type, id) => {
    haptic.select();
    dispatch({ type, id });
    setView(null);
  };

  const buySlots = () => {
    haptic.success();
    dispatch({ type: 'buySlots' });
  };

  const setTalisman = (id) => {
    haptic.success();
    dispatch({ type: 'setTalisman', id });
  };

  const clearTalisman = (id) => {
    haptic.select();
    dispatch({ type: 'clearTalisman', id });
  };

  // ---------- навигация и кнопка «Назад» ----------
  const goBack = useCallback(() => {
    if (sheet) setSheet(null);
    else if (view?.list) setView({ item: view.list });
    else if (view) setView(null);
    else setTab('spin');
  }, [view, sheet]);

  const canGoBack = Boolean(view) || Boolean(sheet) || tab !== 'spin';

  useEffect(() => {
    if (canGoBack) backButton.show(goBack);
    else backButton.hide();
    return () => backButton.hide();
  }, [canGoBack, goBack]);

  const openTab = (id) => {
    haptic.select();
    setView(null);
    setSheet(null);
    setTab(id);
  };

  const openItem = (id) => setView({ item: id });

  let body;
  if (!loaded) {
    body = <div className="screen"><p className="note">Загрузка…</p></div>;
  } else if (view === 'odds') {
    body = <OddsScreen platform={platform} luck={luck} />;
  } else if (view === 'lookup') {
    body = <LookupScreen platform={platform} />;
  } else if (view?.lot) {
    const lot = market?.lots.find((l) => l.id === view.lot);
    body = (
      <LotScreen
        lot={lot}
        drop={lot ? hydrate({ id: lot.id, name: lot.name, platform: lot.platform, ts: lot.ts }) : null}
        market={market}
        coins={state.coins}
        free={free}
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
    const it = items.find((d) => d.id === view.item);
    body = (
      <ItemScreen
        drop={it}
        isTalisman={Object.values(state.talismans).includes(view.item)}
        onSell={() => itemAction('sellItem', view.item)}
        onScrap={() => itemAction('scrapItem', view.item)}
        onShare={shareDrop}
        onList={() => setView({ list: view.item })}
        onTalisman={() => setTalisman(view.item)}
        onUntalisman={() => clearTalisman(view.item)}
      />
    );
  } else if (tab === 'spin') {
    body = (
      <SpinScreen
        platform={platform}
        onPlatform={setPlatform}
        pending={pending}
        revealed={revealed}
        onSpin={spin}
        onRevealed={onRevealed}
        onDecide={decide}
        onDecideAll={decideAll}
        onShare={shareDrop}
        spins={state.spins}
        count={count}
        onCount={setCount}
        level={level}
        free={free}
        capacity={capacity(state)}
        onOpenSpins={() => setSheet('spins')}
        onOpenCollection={() => openTab('collection')}
        onOdds={() => setView('odds')}
      />
    );
  } else if (tab === 'collection') {
    body = (
      <CollectionScreen
        items={items}
        filter={filter}
        onFilter={setFilter}
        onOpen={openItem}
        capacity={capacity(state)}
        coins={state.coins}
        slotCost={slotPrice(state.slotsBought)}
        onBuySlots={buySlots}
        talismans={state.talismans}
        luck={luck}
      />
    );
  } else if (tab === 'market') {
    body = (
      <ExchangeScreen
        market={market}
        now={now}
        part={exPart}
        onPart={setExPart}
        filter={exFilter}
        onFilter={setExFilter}
        free={free}
        onOpenLot={(id) => setView({ lot: id })}
        onUnlist={exAction('unlist')}
        onAccept={exAction('acceptOffer')}
        onDecline={exAction('declineOffer')}
        onGoCollection={() => openTab('collection')}
      />
    );
  } else {
    body = (
      <ProfileScreen
        items={items}
        coins={state.coins}
        lifetime={state.lifetime}
        level={level}
        luck={luck}
        onOpen={openItem}
        onShare={shareDrop}
      />
    );
  }

  const avatarActive = tab === 'profile' && !view;

  return (
    <div className="app">
      <Header
        coins={state.coins}
        spins={state.spins}
        cap={cap}
        luck={luck}
        badge={badge}
        back={!isTelegram && canGoBack}
        onBack={goBack}
        onSpins={() => setSheet('spins')}
        onSearch={() => {
          haptic.select();
          setSheet(null);
          setView('lookup');
        }}
        onTasks={() => {
          haptic.select();
          setSheet('tasks');
        }}
      />

      <main className="content" key={`${tab}:${typeof view === 'object' && view ? Object.keys(view)[0] : view}`}>
        {body}
      </main>

      <TabBar
        tabs={TABS}
        active={view || tab === 'profile' ? null : tab}
        onSelect={openTab}
        avatar={<UserAvatar />}
        avatarActive={avatarActive}
        onAvatar={() => openTab('profile')}
        badges={{ market: market ? market.offers.length : 0 }}
      />

      <Toasts items={toasts} />

      {loaded && market?.summary && (
        <SummaryModal summary={market.summary} onClose={() => dispatch({ type: 'dismissSummary' })} />
      )}

      <BottomSheet open={sheet === 'tasks'} onClose={() => setSheet(null)} overline="Задания и достижения" title="Задания">
        <TasksScreen state={state} items={items} now={now} onClaim={claim} onClaimDaily={claimDaily} />
      </BottomSheet>

      <BottomSheet open={sheet === 'spins'} onClose={() => setSheet(null)} overline="Запас" title="Крутки">
        <div className="sheet-sec">
          <div className="big-line">
            <Icon name="bolt" size={22} /> {fmtThin(state.spins)}
            {state.spins < cap && <small> / {cap}</small>}
          </div>
          <p className="note">
            {nextIn !== null
              ? `+1 через ${fmtTime(nextIn)}. Крутки копятся сами: +1 каждые ${fmtTime(intervalOf(state))}, до ${cap}.`
              : `Запас полон: ${cap}. Бесплатные крутки копятся сами: +1 каждые ${fmtTime(intervalOf(state))}.`}{' '}
            Купленные крутки сверх запаса не сгорают.
          </p>
          <div className="act">
            <button className="btn-sec" onClick={() => buySpins(1)} disabled={state.coins < buyPrice(state, now, 1)}>
              +1 крутка
              <small>{rub(buyPrice(state, now, 1))}</small>
            </button>
            <button className="btn-sec" onClick={() => buySpins(5)} disabled={state.coins < buyPrice(state, now, 5)}>
              +5 круток
              <small>{rub(buyPrice(state, now, 5))}</small>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
