import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, uid } from '../store';
import { getLayout, getTemplate, layoutGeometry, slotAspect } from '../lib/templates';
import { FILTERS, filterImageFile } from '../lib/filters';
import { EFFECTS } from '../lib/effects';
import { sfx } from '../lib/sound';
import { hasMultipleCameras } from '../lib/camera';
import { ensureCall, requestGuestShot, send, useRemote } from '../lib/remote';
import { CameraView, type CameraHandle, type CamState, type FaceState } from '../components/CameraView';
import { CountdownBar, type CountdownState } from '../components/Countdown';
import { Button, Chip, Label, PixelIcon, Segmented, Toggle } from '../components/ui';
import { RemoteVideo } from '../components/RemoteVideo';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Booth() {
  const { settings, patchSettings, shots, setShot, clearShots, cust, setSlotCount, templateId, mode, players, go } = useStore();
  const template = getTemplate(templateId);
  const layout = getLayout(template.layout);
  const aspect = useMemo(() => slotAspect(layoutGeometry(template.layout, cust.slotCount).slots[0]), [template.layout, cust.slotCount]);
  const cam = useRef<CameraHandle>(null);
  const [camState, setCamState] = useState<CamState>('loading');
  const [faceState, setFaceState] = useState<FaceState>('off');
  const [cd, setCd] = useState<CountdownState | null>(null);
  const [flash, setFlash] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [multiCam, setMultiCam] = useState(false);
  const cancel = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const remote = useRemote();
  const n = cust.slotCount;

  useEffect(() => {
    void hasMultipleCameras().then(setMultiCam);
    return () => {
      cancel.current = true;
    };
  }, []);

  useEffect(() => {
    if (mode === 'remote' && remote.status === 'connected') send({ t: 'hello', templateId, players });
  }, [mode, remote.status, templateId, players]);

  useEffect(() => {
    if (faceState === 'slow') {
      patchSettings({ effect: 'none' });
      setNote('Face effects were paused to keep the camera smooth on this device. Look filters still work.');
    } else if (faceState === 'failed') {
      setNote("Face effects couldn't load. Check your connection; look filters still work.");
    }
  }, [faceState, patchSettings]);

  const playerFor = (i: number) => (mode === 'solo' ? 0 : i % players.length);

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
    const name = mode === 'solo' ? `SHOT ${i + 1} OF ${n}` : `${players[player] || `PLAYER ${player + 1}`} · SHOT ${i + 1}`;
    const secs = settings.burst && !first ? 1 : settings.countdown;
    if (mode === 'remote' && player === 1) {
      const [blob] = await Promise.all([requestGuestShot(i, secs), countdown(secs, `${name} (REMOTE)`)]);
      if (cancel.current) return;
      if (settings.sound) sfx.shutter();
      setShot(i, { id: uid(), url: URL.createObjectURL(blob), player });
      return;
    }
    await countdown(secs, name);
    if (cancel.current || !cam.current) return;
    fire();
    const blob = await cam.current.capture();
    setShot(i, { id: uid(), url: URL.createObjectURL(blob), player });
  };

  const run = async (indices: number[]) => {
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
    } catch (e) {
      setNote(String((e as Error).message ?? e));
    } finally {
      setCd(null);
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
    for (let k = 0; k < list.length; k++) {
      const target = order[k];
      try {
        const blob = await filterImageFile(list[k], settings.filter);
        setShot(target, { id: uid(), url: URL.createObjectURL(blob), player: playerFor(target) });
      } catch {
        setNote(`Couldn't read ${list[k].name}.`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const filled = Array.from({ length: n }, (_, i) => shots[i]).filter(Boolean).length;
  const remoteBlocked = mode === 'remote' && remote.status !== 'connected';

  return (
    <section className="screen booth">
      <div className="booth-stage">
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
        >
          <CountdownBar state={cd} sound={settings.sound} />
          {flash && <div className="flash" />}
          {faceState === 'loading' && <div className="cam-tag blink">LOADING FACE TRACKER…</div>}
          {mode === 'remote' && <RemoteVideo />}
        </CameraView>

        <div className="tray" aria-label="Shots">
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className={`tray-slot ${shots[i] ? 'tray-full' : ''}`}>
              {shots[i] ? <img src={shots[i].url} alt={`Shot ${i + 1}`} /> : <span>{i + 1}</span>}
              {mode !== 'solo' && <em className="tray-p">P{playerFor(i) + 1}</em>}
              {shots[i] && !running && (
                <button className="retake" onClick={() => void run([i])} title={`Retake shot ${i + 1}`} disabled={remoteBlocked}>
                  ↻
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="row wrap booth-actions">
          {!running ? (
            <Button
              variant="primary"
              big
              onClick={startAll}
              disabled={(camState !== 'live' && !(mode === 'remote' && players.length > 1)) || remoteBlocked}
            >
              {filled ? 'SHOOT AGAIN' : 'START ▶'}
            </Button>
          ) : (
            <Button variant="danger" big onClick={stop}>
              STOP
            </Button>
          )}
          <Button onClick={() => fileRef.current?.click()} disabled={running}>
            UPLOAD PHOTOS
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
          <Button variant="lime" disabled={running || filled === 0} onClick={() => go('arrange')}>
            NEXT: ARRANGE ▶
          </Button>
        </div>
        {remoteBlocked && <p className="warn">Waiting for Player 2 to connect. Go back to Start to share the link again.</p>}
        {note && <p className="warn">{note}</p>}
      </div>

      <aside className="booth-panel">
        <Label>LOOK FILTER</Label>
        <div className="row wrap">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={settings.filter === f.id} onClick={() => patchSettings({ filter: f.id })}>
              {f.name.toUpperCase()}
            </Chip>
          ))}
        </div>

        <Label>FACE EFFECT</Label>
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

        <Label>COUNTDOWN</Label>
        <Segmented
          label="Countdown"
          value={settings.countdown}
          options={[3, 5, 10].map((v) => ({ value: v as 3 | 5 | 10, label: `${v}s` }))}
          onChange={(v) => patchSettings({ countdown: v })}
        />

        <Label>SHOTS</Label>
        <Segmented
          label="Number of shots"
          value={n}
          options={layout.slots.map((v) => ({ value: v, label: String(v) }))}
          onChange={(v) => !running && setSlotCount(v)}
        />

        <Label>OPTIONS</Label>
        <div className="toggles">
          <Toggle on={settings.flash} onChange={(v) => patchSettings({ flash: v })}>
            Flash
          </Toggle>
          <Toggle on={settings.sound} onChange={(v) => patchSettings({ sound: v })}>
            Sound
          </Toggle>
          <Toggle on={settings.mirror} onChange={(v) => patchSettings({ mirror: v })}>
            Mirror
          </Toggle>
          <Toggle on={settings.burst} onChange={(v) => patchSettings({ burst: v })}>
            Burst (1s between)
          </Toggle>
        </div>
        {multiCam && (
          <Button
            onClick={() =>
              patchSettings({
                facing: settings.facing === 'user' ? 'environment' : 'user',
                mirror: settings.facing !== 'user',
              })
            }
            disabled={running}
          >
            ⇄ SWITCH CAMERA
          </Button>
        )}
        <p className="muted small">Template: {template.name}. Filters and effects are baked into each shot.</p>
      </aside>
    </section>
  );
}
