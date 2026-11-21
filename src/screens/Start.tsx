import { useState } from 'react';
import { APP_NAME, APP_TAGLINE } from '../config';
import { useStore } from '../store';
import { Button, PixelIcon } from '../components/ui';
import { sfx } from '../lib/sound';
import { hostSession, leaveSession, useRemote } from '../lib/remote';
import type { Mode } from '../types';

export function Start() {
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<Mode | null>(null);
  const { setMode, setPlayers, players, go, settings } = useStore();
  const remote = useRemote();
  const [copied, setCopied] = useState(false);

  const press = () => {
    sfx.unlock();
    if (settings.sound) sfx.coin();
    setStarted(true);
  };

  const choose = (m: Mode) => {
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
    <section className="start">
      <div className="start-sky" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="sky-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${i * 0.21}s` }} />
        ))}
      </div>

      <div className="start-hero">
        <p className="kicker">★ FREE PLAY · NO SIGN-UP ★</p>
        <h1 className="title">{APP_NAME}</h1>
        <p className="tagline">{APP_TAGLINE}</p>

        {!started ? (
          <Button variant="primary" big className="press-start" onClick={press} autoFocus>
            PRESS START
          </Button>
        ) : (
          <div className="modes">
            <p className="label center">SELECT MODE</p>
            <div className="mode-grid">
              <ModeCard icon="smile" title="1 PLAYER" desc="Just you and the camera" on={picked === 'solo'} onClick={() => choose('solo')} />
              <ModeCard icon="heart" title="2–4 PLAYERS" desc="Take turns on this device" on={picked === 'together'} onClick={() => choose('together')} />
              <ModeCard icon="bolt" title="ONLINE CO-OP" desc="Send a link, share one strip" on={picked === 'remote'} onClick={() => choose('remote')} />
            </div>

            {picked === 'together' && (
              <div className="panel">
                <p className="label">PLAYERS</p>
                <div className="row wrap">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className={`chip ${players.length === n ? 'chip-on' : ''}`}
                      onClick={() =>
                        setPlayers(Array.from({ length: n }, (_, i) => players[i] ?? `PLAYER ${i + 1}`))
                      }
                    >
                      {n} PLAYERS
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
                  CONTINUE ▶
                </Button>
              </div>
            )}

            {picked === 'remote' && (
              <div className="panel">
                <p className="label">ONLINE CO-OP</p>
                {remote.status === 'opening' && <p className="blink">OPENING A ROOM…</p>}
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
                    <p>Send this link to Player 2. You'll each shoot on your own camera and end up on one strip.</p>
                    <div className="linkbox">
                      <input readOnly value={remote.link} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
                      <Button onClick={copy}>{copied ? 'COPIED' : 'COPY'}</Button>
                      {'share' in navigator && <Button onClick={shareLink}>SHARE</Button>}
                    </div>
                    {remote.status === 'waiting' ? (
                      <p className="blink">WAITING FOR PLAYER 2…</p>
                    ) : (
                      <p className="ok">★ PLAYER 2 JOINED ★</p>
                    )}
                  </>
                )}
                {remote.status === 'closed' && <p className="warn">Player 2 left. Share the link again to reconnect.</p>}
                <Button variant="primary" disabled={remote.status !== 'connected'} onClick={() => go('template')}>
                  CONTINUE ▶
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ground" aria-hidden />
      <p className="privacy">
        <PixelIcon id="plus" size={12} /> Photos are made and kept on your device. Nothing is uploaded unless you share it.
      </p>
    </section>
  );
}

function ModeCard({ icon, title, desc, on, onClick }: { icon: string; title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button className={`mode-card ${on ? 'mode-on' : ''}`} onClick={onClick}>
      <PixelIcon id={icon} size={40} />
      <span className="mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  );
}
