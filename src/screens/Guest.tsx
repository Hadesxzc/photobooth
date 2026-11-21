import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { getTemplate, layoutGeometry, slotAspect } from '../lib/templates';
import { FILTERS, canvasToBlob } from '../lib/filters';
import { DEFAULT_LOOK, renderLook } from '../lib/process';
import { EFFECTS } from '../lib/effects';
import { sfx } from '../lib/sound';
import { joinSession, leaveSession, onMessage, send, useRemote } from '../lib/remote';
import { APP_NAME } from '../config';
import { CameraView, type CameraHandle, type CamState } from '../components/CameraView';
import { CountdownBar, type CountdownState } from '../components/Countdown';
import { RemoteVideo } from '../components/RemoteVideo';
import { Button, Chip, Label, PixelIcon, Toggle } from '../components/ui';

/** Player 2's screen in online co-op, opened from an invite link (?join=<id>). */
export function Guest({ hostId }: { hostId: string }) {
  const { settings, patchSettings } = useStore();
  const remote = useRemote();
  const [joined, setJoined] = useState(false);
  const [camState, setCamState] = useState<CamState>('loading');
  const [templateId, setTemplateId] = useState('night-strip');
  const [cd, setCd] = useState<CountdownState | null>(null);
  const [flash, setFlash] = useState(false);
  const [lit, setLit] = useState(false);
  const [count, setCount] = useState(0);
  const [strip, setStrip] = useState<{ url: string; name: string } | null>(null);
  const cam = useRef<CameraHandle>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const template = getTemplate(templateId);
  const aspect = useMemo(() => slotAspect(layoutGeometry(template.layout, template.defaults.slotCount).slots[0]), [template]);

  useEffect(() => {
    if (!joined) return;
    return onMessage(async (m) => {
      if (m.t === 'hello') setTemplateId(m.templateId);
      if (m.t === 'shoot') {
        setCd({ total: m.countdown, startedAt: performance.now(), banner: `YOUR TURN · SHOT ${m.index + 1}` });
        await new Promise((r) => setTimeout(r, m.countdown * 1000));
        setCd(null);
        if (!cam.current) return;
        let shot: { raw: Blob; fx?: Blob };
        if (settingsRef.current.light) {
          setLit(true);
          await new Promise((r) => setTimeout(r, 260));
          if (settingsRef.current.sound) sfx.shutter();
          shot = await cam.current.capture();
          await new Promise((r) => setTimeout(r, 80));
          setLit(false);
        } else {
          if (settingsRef.current.flash) {
            setFlash(true);
            setTimeout(() => setFlash(false), 180);
          }
          if (settingsRef.current.sound) sfx.shutter();
          shot = await cam.current.capture();
        }
        const { raw, fx } = shot;
        const rawUrl = URL.createObjectURL(raw);
        const fxUrl = fx ? URL.createObjectURL(fx) : undefined;
        const done = await renderLook(rawUrl, fxUrl, { ...DEFAULT_LOOK, filter: settingsRef.current.filter });
        const blob = await canvasToBlob(done);
        URL.revokeObjectURL(rawUrl);
        if (fxUrl) URL.revokeObjectURL(fxUrl);
        send({ t: 'shot', index: m.index, data: await blob.arrayBuffer() });
        setCount((c) => c + 1);
      }
      if (m.t === 'strip') {
        const url = URL.createObjectURL(new Blob([m.data], { type: 'image/png' }));
        setStrip({ url, name: m.name });
        if (settingsRef.current.sound) sfx.win();
      }
    });
  }, [joined]);

  useEffect(() => () => leaveSession(), []);

  const join = () => {
    sfx.unlock();
    if (settings.sound) sfx.coin();
    setJoined(true);
  };

  // Connect once the camera is live, so the host's video call can be answered with our stream.
  useEffect(() => {
    if (joined && camState === 'live' && remote.status === 'idle') void joinSession(hostId);
  }, [joined, camState, remote.status, hostId]);

  if (!joined)
    return (
      <section className="start">
        <div className="start-hero">
          <p className="kicker">★ ONLINE CO-OP ★</p>
          <h1 className="title">{APP_NAME}</h1>
          <p className="tagline">You've been invited to a photobooth as Player 2.</p>
          <Button variant="primary" big className="press-start" onClick={join} autoFocus>
            JOIN AS PLAYER 2
          </Button>
          <p className="privacy">
            Your camera feed and photos go straight to Player 1's browser over a peer-to-peer link. Nothing is stored on a server.
          </p>
        </div>
      </section>
    );

  if (strip)
    return (
      <section className="screen center-col">
        <p className="kicker">★ STAGE CLEAR ★</p>
        <h2>YOUR STRIP</h2>
        <img className="guest-strip" src={strip.url} alt="Finished photo strip" />
        <a className="btn btn-primary btn-big" href={strip.url} download={strip.name}>
          DOWNLOAD PNG
        </a>
      </section>
    );

  return (
    <section className="screen booth">
      {settings.light && cd && <div className="ring-light" aria-hidden />}
      {lit && <div className="screen-flash" aria-hidden />}
      <div className="booth-stage">
        <CameraView
          ref={cam}
          aspect={aspect}
          filter={settings.filter}
          effect={settings.effect}
          mirror={settings.mirror}
          facing={settings.facing}
          onCamState={setCamState}
        >
          <CountdownBar state={cd} sound={settings.sound} />
          {flash && <div className="flash" />}
          <RemoteVideo label="P1" />
        </CameraView>
        <div className="status-line">
          {remote.status === 'opening' && <p className="blink">CONNECTING…</p>}
          {remote.status === 'connected' && !cd && (
            <p className="ok">
              ★ CONNECTED ★ {count ? `${count} shot${count > 1 ? 's' : ''} sent. ` : ''}Player 1 starts the countdown.
            </p>
          )}
          {remote.status === 'closed' && <p className="warn">Player 1 left the session.</p>}
          {remote.status === 'error' && <p className="warn">{remote.error}</p>}
          {camState === 'denied' && <p className="warn">Online co-op needs your camera. Allow it in your browser's site settings.</p>}
        </div>
      </div>
      <aside className="booth-panel">
        <Label>Filter</Label>
        <div className="row wrap">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={settings.filter === f.id} onClick={() => patchSettings({ filter: f.id })}>
              {f.name}
            </Chip>
          ))}
        </div>
        <Label>Face effect</Label>
        <div className="fx-grid">
          {EFFECTS.map((e) => (
            <button
              key={e.id}
              className={`fx ${settings.effect === e.id ? 'fx-on' : ''}`}
              onClick={() => patchSettings({ effect: e.id })}
              aria-pressed={settings.effect === e.id}
            >
              <PixelIcon id={e.icon} size={30} />
              <span>{e.name}</span>
            </button>
          ))}
        </div>
        <div className="toggles">
          <Toggle on={settings.light} onChange={(v) => patchSettings({ light: v })}>
            Screen light
          </Toggle>
          <Toggle on={settings.mirror} onChange={(v) => patchSettings({ mirror: v })}>
            Mirror
          </Toggle>
          <Toggle on={settings.sound} onChange={(v) => patchSettings({ sound: v })}>
            Sound
          </Toggle>
        </div>
      </aside>
    </section>
  );
}
