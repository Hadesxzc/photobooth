import { APP_NAME } from './config';
import { STEPS, useStore } from './store';
import { Start } from './screens/Start';
import { Templates } from './screens/Templates';
import { Booth } from './screens/Booth';
import { Arrange } from './screens/Arrange';
import { Customize } from './screens/Customize';
import { Export } from './screens/Export';
import { Guest } from './screens/Guest';
import { PixelIcon } from './components/ui';

export default function App() {
  const joinId = new URLSearchParams(location.search).get('join');
  const { step, furthest, go, shots } = useStore();

  if (joinId)
    return (
      <div className="app">
        <TopBar />
        <Guest hostId={joinId} />
      </div>
    );

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
        {step === 'arrange' && <Arrange />}
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
        <PixelIcon id="star" size={18} />
        <span>{APP_NAME}</span>
      </a>
      {children}
    </header>
  );
}
