import { useEffect, useState } from 'react';
import { APP_NAME } from './config';
import { STEPS, useStore } from './store';
import { Start } from './screens/Start';
import { Templates } from './screens/Templates';
import { Booth } from './screens/Booth';
import { Peek } from './screens/Peek';
import { Glow } from './screens/Glow';
import { Customize } from './screens/Customize';
import { Export } from './screens/Export';
import { Guest } from './screens/Guest';
import { Landing } from './components/Landing';

const BRAND = APP_NAME;

const NAV = [
  { label: 'Home', hash: '' },
  { label: 'How it works', hash: 'how' },
  { label: 'Templates', hash: 'templates' },
  { label: 'FAQ', hash: 'faq' },
];

export default function App() {
  const joinId = new URLSearchParams(location.search).get('join');
  const { step, furthest, go, shots } = useStore();
  const [entered, setEntered] = useState(() => new URLSearchParams(location.search).has('booth'));
  const [jumpTo, setJumpTo] = useState<string | null>(null);

  // After going back to the landing page, scroll to the section the user picked.
  useEffect(() => {
    if (entered || jumpTo === null) return;
    const el = jumpTo ? document.getElementById(jumpTo) : null;
    if (el) el.scrollIntoView();
    else window.scrollTo({ top: 0 });
    setJumpTo(null);
  }, [entered, jumpTo]);

  if (joinId)
    return (
      <div className="app">
        <header className="topbar">
          <div className="topbar-row">
            <span className="logo">{BRAND}</span>
          </div>
        </header>
        <Guest hostId={joinId} />
      </div>
    );

  const enter = () => {
    window.scrollTo({ top: 0 });
    history.replaceState(null, '', `${location.pathname}?booth`);
    setEntered(true);
  };

  const leave = (hash: string) => {
    history.replaceState(null, '', location.pathname);
    setEntered(false);
    setJumpTo(hash);
  };

  if (!entered) return <Landing onStart={enter} />;

  const current = STEPS.findIndex((s) => s.id === step);
  const hasShots = shots.some(Boolean);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <button className="logo logo-btn" onClick={() => leave('')} aria-label={`${BRAND} home`}>
            {BRAND}
          </button>
          <nav className="topnav" aria-label="Site">
            {NAV.map((n) => (
              <button key={n.label} onClick={() => leave(n.hash)}>
                {n.label}
              </button>
            ))}
          </nav>
          <span className="topbar-pill" aria-current="page">
            In the booth
          </span>
        </div>
        <nav className="steps" aria-label="Booth progress">
          {STEPS.map((s, i) => {
            const needsShots = i > 2 && !hasShots;
            const enabled = i <= furthest && !needsShots;
            return (
              <button
                key={s.id}
                className={`step ${i === current ? 'step-on' : ''} ${i < current ? 'step-done' : ''}`}
                disabled={!enabled}
                onClick={() => go(s.id)}
                aria-current={i === current ? 'step' : undefined}
              >
                <b>{i < current ? '✓' : i + 1}</b>
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      <main>
        {step === 'start' && <Start />}
        {step === 'template' && <Templates />}
        {step === 'booth' && <Booth />}
        {step === 'peek' && <Peek />}
        {step === 'glow' && <Glow />}
        {step === 'customize' && <Customize />}
        {step === 'export' && <Export />}
      </main>
    </div>
  );
}
