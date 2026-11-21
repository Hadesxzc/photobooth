import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, uid } from '../store';
import { LAYOUTS, getLayout, getTemplate, layoutGeometry, slotAspect } from '../lib/templates';
import { FILTERS, loadUpload } from '../lib/filters';
import { DEFAULT_LOOK, makeShot } from '../lib/process';
import { EFFECTS } from '../lib/effects';
import { sfx } from '../lib/sound';
import { hasMultipleCameras } from '../lib/camera';
import { ensureCall, requestGuestShot, send, useRemote } from '../lib/remote';
import { CameraView, type CameraHandle, type CamState, type FaceState } from '../components/CameraView';
import { CountdownBar, type CountdownState } from '../components/Countdown';
import { Button, Chip, Label, PixelIcon, Segmented, Toggle } from '../components/ui';
import { RemoteVideo } from '../components/RemoteVideo';
import { Bow } from '../components/Decor';
import type { LayoutId } from '../types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HEAD = {
  solo: { kicker: 'solo booth', title: 'Just you, looking cute.' },
  together: { kicker: 'friends booth', title: 'Squeeze in together.' },
  remote: { kicker: 'long-distance booth', title: 'Two cameras, one strip.' },
};

export function Booth() {
  const {
    settings, patchSettings, shots, setShot, clearShots, cust, setSlotCount, templateId, pickTemplate,
    mode, players, go, pendingRetake, setPendingRetake, camOn, setCamOn,
  } = useStore();
  const template = getTemplate(templateId);
  const layout = getLayout(template.layout);
  const aspect = useMemo(() => slotAspect(layoutGeometry(template.layout, cust.slotCount).slots[0]), [template.layout, cust.slotCount]);
  const cam = useRef<CameraHandle>(null);
  const [camState, setCamState] = useState<CamState>('loading');
  const [faceState, setFaceState] = useState<FaceState>('off');
  const [cd, setCd] = useState<CountdownState | null>(null);
  const [flash, setFlash] = useState(false);
  const [lit, setLit] = useState(false);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [multiCam, setMultiCam] = useState(false);
  const [tab, setTab] = useState<'session' | 'look'>(camOn ? 'look' : 'session');
  const cancel = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const remote = useRemote();
  const n = cust.slotCount;
  const live = camOn && camState === 'live';

  useEffect(() => {
    void hasMultipleCameras().then(setMultiCam);
    return () => {
      cancel.current = true;
    };
  }, []);

  useEffect(() => {
    if (pendingRetake !== null && !camOn) setCamOn(true);
  }, [pendingRetake, camOn, setCamOn]);

  useEffect(() => {
    if (mode === 'remote' && remote.status === 'connected') send({ t: 'hello', templateId, players });
  }, [mode, remote.status, templateId, players]);

  useEffect(() => {
    if (faceState === 'slow') {
      patchSettings({ effect: 'none' });
      setNote('Face effects were paused to keep the camera smooth on this device. Filters still work.');
    } else if (faceState === 'failed') {
      setNote("Face effects couldn't load. Check your connection; filters still work.");
    }
  }, [faceState, patchSettings]);

  const playerFor = (i: number) => (mode === 'solo' ? 0 : i % players.length);
  const nameFor = (i: number) => players[playerFor(i)] || `Player ${playerFor(i) + 1}`;

  const countdown = async (secs: number, banner?: string) => {
    setCd({ total: secs, startedAt: performance.now(), banner });
    await sleep(secs * 1000);
    setCd(null);
  };

  const fire = () => {
    if (settings.flash) {
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
    }
    if (settings.sound) sfx.shutter();
  };

  const shootOne = async (i: number, first: boolean) => {
    const player = playerFor(i);
    const banner = mode === 'solo' ? `Photo ${i + 1} of ${n}` : `${nameFor(i)} · photo ${i + 1}`;
    const secs = settings.burst && !first ? 1 : settings.countdown;
    setCurrent(i);
    if (mode === 'remote' && player === 1) {
      const [blob] = await Promise.all([requestGuestShot(i, secs), countdown(secs, `${banner} (their camera)`)]);
      if (cancel.current) return;
      if (settings.sound) sfx.shutter();
      setShot(i, await makeShot(uid(), blob, undefined, DEFAULT_LOOK, player));
      return;
    }
    await countdown(secs, banner);
    if (cancel.current || !cam.current) return;
    let shot: { raw: Blob; fx?: Blob };
    if (settings.light) {
      // Light the face first, give the camera a moment to adjust exposure, then capture.
      setLit(true);
      await sleep(260);
      if (settings.sound) sfx.shutter();
      shot = await cam.current.capture();
      await sleep(80);
      setLit(false);
    } else {
      fire();
      shot = await cam.current.capture();
    }
    const { raw, fx } = shot;
    setShot(i, await makeShot(uid(), raw, fx, { ...DEFAULT_LOOK, filter: settings.filter }, player));
  };

  const run = async (indices: number[], thenPeek = false) => {
    sfx.unlock();
    cancel.current = false;
    setRunning(true);
    setNote('');
    try {
      for (let k = 0; k < indices.length; k++) {
        if (cancel.current) break;
        await shootOne(indices[k], k === 0);
        if (k < indices.length - 1 && !cancel.current) await sleep(settings.burst ? 250 : 700);
      }
      if (!cancel.current && indices.length > 1 && settings.sound) sfx.win();
      const st = useStore.getState();
      const complete = Array.from({ length: st.cust.slotCount }, (_, i) => st.shots[i]).every(Boolean);
      if (!cancel.current && complete && (thenPeek || indices.length > 1)) {
        await sleep(700);
        if (!cancel.current) go('peek');
      }
    } catch (e) {
      setNote(String((e as Error).message ?? e));
    } finally {
      setCd(null);
      setCurrent(null);
      setRunning(false);
    }
  };

  const startAll = () => {
    clearShots();
    void run(Array.from({ length: n }, (_, i) => i));
  };

  const stop = () => {
    cancel.current = true;
    setCd(null);
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    // Fill empty slots first, then replace from the top.
    const all = Array.from({ length: n }, (_, i) => i);
    const order = [...all.filter((i) => !shots[i]), ...all.filter((i) => shots[i])];
    const list = Array.from(files).slice(0, n);
    setNote('Adding your photos…');
    await Promise.all(
      list.map(async (file, k) => {
        const target = order[k];
        try {
          const blob = await loadUpload(file);
          setShot(target, await makeShot(uid(), blob, undefined, { ...DEFAULT_LOOK, filter: settings.filter }, playerFor(target)));
        } catch {
          setNote(`Couldn't read ${file.name}.`);
        }
      })
    );
    setNote((v) => (v === 'Adding your photos…' ? '' : v));
    if (fileRef.current) fileRef.current.value = '';
    const st = useStore.getState();
    if (Array.from({ length: st.cust.slotCount }, (_, i) => st.shots[i]).every(Boolean)) go('peek');
  };

  // Retake requested from the Peek step: shoot that one photo as soon as the camera is ready.
  useEffect(() => {
    if (pendingRetake === null || running) return;
    if (camState !== 'live' && !(mode === 'remote' && playerFor(pendingRetake) === 1)) return;
    const i = pendingRetake;
    setPendingRetake(null);
    void run([i], true);
  }, [pendingRetake, camState]); // eslint-disable-line react-hooks/exhaustive-deps

  const filled = Array.from({ length: n }, (_, i) => shots[i]).filter(Boolean).length;
  const remoteBlocked = mode === 'remote' && remote.status !== 'connected';
  const head = HEAD[mode];

  const guide = !camOn
    ? 'Set things up on the right, then turn on your camera. Or use photos you already have.'
    : camState === 'loading'
      ? 'Turning on your camera… your browser may ask for permission.'
      : camState !== 'live'
        ? "We can't see your camera right now."
        : running
          ? `Photo ${(current ?? 0) + 1} of ${n} · hold that pose!`
          : filled === n
            ? `All ${n} photos taken. Review them next, or shoot again.`
            : `Press Start and the booth takes all ${n} photos for you, with ${settings.countdown} seconds before each one.`;

  const switchLayout = (id: LayoutId) => {
    if (running) return;
    pickTemplate(`${template.collection}-${id}`);
  };

  return (
    <section className="screen booth2">
      {settings.light && camOn && <div className={`ring-light ${running ? 'ring-strong' : ''}`} aria-hidden />}
      {lit && <div className="screen-flash" aria-hidden />}
      <header className="booth-head">
        <p className="mode-step">{head.kicker}</p>
        <h2 className="peek-h">{head.title}</h2>
        <p className="booth-guide">{guide}</p>
      </header>

      <div className="booth-grid">
        <div className="booth-stage">
          {camOn ? (
            <CameraView
              ref={cam}
              aspect={aspect}
              filter={settings.filter}
              effect={settings.effect}
              mirror={settings.mirror}
              facing={settings.facing}
              onCamState={setCamState}
              onFaceState={setFaceState}
              onStream={(s) => mode === 'remote' && ensureCall(s)}
              onUpload={() => fileRef.current?.click()}
            >
              <CountdownBar state={cd} sound={settings.sound} />
              {flash && <div className="flash" />}
              {live && !running && <div className="cam-tag">● Live · {filled} of {n} taken</div>}
              {faceState === 'loading' && <div className="cam-tag cam-tag-r blink">Loading face tracker…</div>}
              {mode === 'remote' && <RemoteVideo />}
            </CameraView>
          ) : (
            <div className="cam-ready" style={{ aspectRatio: String(Math.max(aspect, 1.2)) }}>
              <Bow size={56} />
              <h3>Your booth is ready</h3>
              <p>We'll turn on your camera so you can see yourself live. Your photos stay on this device.</p>
              <div className="row wrap cam-ready-actions">
                <Button
                  variant="primary"
                  big
                  onClick={() => {
                    sfx.unlock();
                    setCamOn(true);
                    setTab('look');
                  }}
                >
                  Turn on camera
                </Button>
                <button className="link-btn" onClick={() => fileRef.current?.click()}>
                  Use my photos
                </button>
              </div>
            </div>
          )}

          <div className="tray2" aria-label="Photos">
            {Array.from({ length: n }, (_, i) => (
              <figure key={i} className={`tray2-slot ${shots[i] ? 'full' : ''} ${current === i ? 'now' : ''}`}>
                <div className="tray2-img">
                  {shots[i] ? <img src={shots[i].url} alt={`Photo ${i + 1}`} /> : <span>{i + 1}</span>}
                </div>
                <figcaption>{mode === 'solo' ? `Photo ${i + 1}` : nameFor(i)}</figcaption>
              </figure>
            ))}
          </div>

          {camOn && (
            <button
              className={`light-toggle ${settings.light ? 'on' : ''}`}
              onClick={() => patchSettings({ light: !settings.light })}
              aria-pressed={settings.light}
              title="Turns your screen into a soft light while you shoot"
            >
              <span className="light-bulb" aria-hidden>☀</span>
              Screen light: {settings.light ? 'on' : 'off'}
            </button>
          )}

          <div className="row wrap booth-actions">
            {camOn &&
              (!running ? (
                <Button variant="primary" big onClick={startAll} disabled={!live || remoteBlocked}>
                  {filled ? 'Shoot again' : 'Start'}
                </Button>
              ) : (
                <Button variant="danger" big onClick={stop}>
                  Stop
                </Button>
              ))}
            {filled > 0 && (
              <Button variant="lime" disabled={running} onClick={() => go('peek')}>
                Review photos
              </Button>
            )}
            {camOn && (
              <button className="link-btn" onClick={() => fileRef.current?.click()} disabled={running}>
                Use my photos instead
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
          </div>
          {remoteBlocked && <p className="warn">Waiting for your friend to connect. Go back to Start to share the link again.</p>}
          {note && <p className={note.startsWith('Adding') ? 'muted' : 'warn'}>{note}</p>}
        </div>

        <aside className="booth-panel">
          <div className="booth-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'session'} className={tab === 'session' ? 'on' : ''} onClick={() => setTab('session')}>
              Session
            </button>
            <button role="tab" aria-selected={tab === 'look'} className={tab === 'look' ? 'on' : ''} onClick={() => setTab('look')}>
              Effects & filters
            </button>
          </div>

          {tab === 'session' && (
            <>
              <Label>Photos per strip</Label>
              <Segmented
                label="Photos per strip"
                value={n}
                options={layout.slots.map((v) => ({ value: v, label: String(v) }))}
                onChange={(v) => !running && setSlotCount(v)}
              />
              <p className="muted small">Taken automatically, one after another.</p>

              <Label>Countdown before each photo</Label>
              <Segmented
                label="Countdown"
                value={settings.countdown}
                options={[3, 5, 10].map((v) => ({ value: v as 3 | 5 | 10, label: `${v}s` }))}
                onChange={(v) => patchSettings({ countdown: v })}
              />

              <Label>Strip layout</Label>
              <div className="layout-grid">
                {LAYOUTS.map((l) => (
                  <button key={l.id} className={template.layout === l.id ? 'on' : ''} onClick={() => switchLayout(l.id)} aria-pressed={template.layout === l.id}>
                    <LayoutIcon id={l.id} />
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>

              <Label>Options</Label>
              <div className="toggles col">
                <Toggle on={settings.light} onChange={(v) => patchSettings({ light: v })}>
                  Screen light (brightens your face)
                </Toggle>
                <Toggle on={settings.flash} onChange={(v) => patchSettings({ flash: v })}>
                  Flash effect on each photo
                </Toggle>
                <Toggle on={settings.sound} onChange={(v) => patchSettings({ sound: v })}>
                  Shutter sound
                </Toggle>
                <Toggle on={settings.mirror} onChange={(v) => patchSettings({ mirror: v })}>
                  Mirror my camera
                </Toggle>
                <Toggle on={settings.burst} onChange={(v) => patchSettings({ burst: v })}>
                  Quick mode (1s between photos)
                </Toggle>
              </div>
              {multiCam && (
                <Button
                  onClick={() => patchSettings({ facing: settings.facing === 'user' ? 'environment' : 'user', mirror: settings.facing !== 'user' })}
                  disabled={running}
                >
                  Switch camera
                </Button>
              )}
            </>
          )}

          {tab === 'look' && (
            <>
              <Label>Face effect</Label>
              <div className="fx-grid">
                {EFFECTS.map((e) => (
                  <button
                    key={e.id}
                    className={`fx ${settings.effect === e.id ? 'fx-on' : ''}`}
                    onClick={() => {
                      setNote('');
                      patchSettings({ effect: e.id });
                    }}
                    title={e.name}
                    aria-pressed={settings.effect === e.id}
                  >
                    <PixelIcon id={e.icon} size={30} />
                    <span>{e.name}</span>
                  </button>
                ))}
              </div>
              {settings.effect === 'coins' && <p className="muted small">Open your mouth to release coins.</p>}
              <Label>Filter</Label>
              <div className="row wrap">
                {FILTERS.map((f) => (
                  <Chip key={f.id} active={settings.filter === f.id} onClick={() => patchSettings({ filter: f.id })}>
                    {f.name}
                  </Chip>
                ))}
              </div>
              <p className="muted small">You can change the filter later in the Glow step.</p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

/** A tiny diagram of a layout, drawn from the same geometry the strip uses. */
function LayoutIcon({ id }: { id: LayoutId }) {
  const l = getLayout(id);
  const g = layoutGeometry(id, l.defaultSlots);
  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} className="layout-icon" aria-hidden>
      <rect x="0" y="0" width={g.w} height={g.h} rx={g.w * 0.04} className="li-bg" />
      {g.slots.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={g.w * 0.02}
          className="li-slot"
          transform={r.rot ? `rotate(${r.rot} ${r.x + r.w / 2} ${r.y + r.h / 2})` : undefined}
        />
      ))}
    </svg>
  );
}
