import { useState } from 'react';
import { APP_NAME } from '../config';
import { STEPS, useStore } from '../store';
import { Button } from '../components/ui';
import { Bow, Heart, Sparkle } from '../components/Decor';
import { sfx } from '../lib/sound';
import { hostSession, leaveSession, useRemote } from '../lib/remote';
import type { Mode } from '../types';

export function Start() {
  const [picked, setPicked] = useState<Mode | null>(null);
  const { setMode, setPlayers, players, go, settings } = useStore();
  const remote = useRemote();
  const [copied, setCopied] = useState(false);

  const choose = (m: Mode) => {
    sfx.unlock();
    if (settings.sound) sfx.blip();
    setPicked(m);
    if (m === 'remote') {
      setMode('remote', ['PLAYER 1', 'PLAYER 2']);
      void hostSession();
    } else {
      if (remote.role) leaveSession();
      setMode(m);
      if (m === 'solo') go('template');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(remote.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the link is still selectable */
    }
  };

  const shareLink = () => {
    void navigator.share?.({ title: APP_NAME, text: 'Join my photobooth as Player 2', url: remote.link }).catch(() => undefined);
  };

  return (
    <section className="screen mode-screen">
      <p className="mode-step">Step 1 of {STEPS.length}</p>
      <h2 className="mode-h">Who's in the photo?</h2>
      <p className="muted">Pick how you're shooting. You can change templates, filters and everything else later.</p>
      <div className="mode-grid">
        <ModeCard icon={<Heart size={30} color="#e889a2" />} title="Just me" desc="Four shots on your own camera." on={picked === 'solo'} onClick={() => choose('solo')} />
        <ModeCard icon={<Bow size={38} color="#d7b4ea" />} title="Friends, one screen" desc="2 to 4 people take turns on this device." on={picked === 'together'} onClick={() => choose('together')} />
        <ModeCard icon={<Sparkle size={30} color="#f2c46b" />} title="Friend, far away" desc="Send a link and share one strip." on={picked === 'remote'} onClick={() => choose('remote')} />
      </div>

      {picked === 'together' && (
        <div className="panel">
          <p className="label">Players</p>
          <div className="row wrap">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                className={`chip ${players.length === n ? 'chip-on' : ''}`}
                onClick={() => setPlayers(Array.from({ length: n }, (_, i) => players[i] ?? `PLAYER ${i + 1}`))}
              >
                {n} players
              </button>
            ))}
          </div>
          <div className="names">
            {players.map((p, i) => (
              <label key={i} className="field">
                <span>P{i + 1}</span>
                <input
                  value={p}
                  maxLength={12}
                  onChange={(e) => setPlayers(players.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
                />
              </label>
            ))}
          </div>
          <Button variant="primary" onClick={() => go('template')}>
            Continue
          </Button>
        </div>
      )}

      {picked === 'remote' && (
        <div className="panel">
          <p className="label">Long-distance mode</p>
          {remote.status === 'opening' && <p className="blink">Opening a room…</p>}
          {remote.status === 'error' && (
            <p className="warn">
              Couldn't open a room: {remote.error}. Check your connection and try again.{' '}
              <button className="link" onClick={() => void hostSession()}>
                Retry
              </button>
            </p>
          )}
          {(remote.status === 'waiting' || remote.status === 'connected') && (
            <>
              <p>Send this link to your friend. You'll each shoot on your own camera and end up on one strip.</p>
              <div className="linkbox">
                <input readOnly value={remote.link} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
                <Button onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
                {'share' in navigator && <Button onClick={shareLink}>Share</Button>}
              </div>
              {remote.status === 'waiting' ? <p className="blink">Waiting for your friend…</p> : <p className="ok">Your friend joined!</p>}
            </>
          )}
          {remote.status === 'closed' && <p className="warn">Player 2 left. Share the link again to reconnect.</p>}
          <Button variant="primary" disabled={remote.status !== 'connected'} onClick={() => go('template')}>
            Continue
          </Button>
        </div>
      )}

      <p className="muted small mode-privacy">Photos are made and kept on your device. Nothing is uploaded unless you share it.</p>
    </section>
  );
}

function ModeCard({ icon, title, desc, on, onClick }: { icon: React.ReactNode; title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button className={`mode-card ${on ? 'mode-on' : ''}`} onClick={onClick}>
      {icon}
      <span className="mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  );
}
