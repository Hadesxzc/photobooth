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
import { Bow } from './components/Decor';
import { Landing } from './components/Landing';
import { useState } from 'react';

export default function App() {
  const joinId = new URLSearchParams(location.search).get('join');
  const { step, furthest, go, shots } = useStore();
  const [entered, setEntered] = useState(() => new URLSearchParams(location.search).has('booth'));

  if (joinId)
    return (
      <div className="app">
        <TopBar />
        <Guest hostId={joinId} />
      </div>
    );

  const enter = () => {
    window.scrollTo({ top: 0 });
    setEntered(true);
  };

  if (!entered) return <Landing onStart={enter} />;

  const current = STEPS.findIndex((s) => s.id === step);
  const hasShots = shots.some(Boolean);

  return (
    <div className="app">
      <TopBar>
        {step !== 'start' && (
          <nav className="steps" aria-label="Progress">
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
                  <b>{i + 1}</b>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </TopBar>
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

function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <a className="logo" href={location.pathname} aria-label={`${APP_NAME} home`}>
        <Bow size={24} />
        <span>{APP_NAME.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())}</span>
      </a>
      {children}
    </header>
  );
}
