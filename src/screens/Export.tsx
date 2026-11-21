import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getTemplate } from '../lib/templates';
import { composeStrip } from '../lib/compose';
import { canvasToBlob } from '../lib/filters';
import { makeStripGif } from '../lib/gif';
import { sfx } from '../lib/sound';
import { send, useRemote } from '../lib/remote';
import { APP_NAME, EXPORT_SCALE } from '../config';
import { StripPreview, useSlotImages } from '../components/StripPreview';
import { Button } from '../components/ui';

export function Export() {
  const { templateId, cust, score, settings, mode, reset, go } = useStore();
  const template = getTemplate(templateId);
  const { images, labels } = useSlotImages();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const remote = useRemote();
  const [sent, setSent] = useState(false);
  const ready = images.length === cust.slotCount;

  const fileBase = `${APP_NAME.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;

  const renderPng = async () => {
    const c = document.createElement('canvas');
    composeStrip(c, { template, cust, images, labels, scale: EXPORT_SCALE, score });
    return canvasToBlob(c, 'image/png');
  };

  useEffect(() => {
    if (settings.sound) sfx.win();
  }, [settings.sound]);

  // Online co-op: hand the finished strip to Player 2 automatically.
  useEffect(() => {
    if (mode !== 'remote' || remote.status !== 'connected' || sent || !ready) return;
    let live = true;
    void (async () => {
      const blob = await renderPng();
      if (!live) return;
      send({ t: 'strip', data: await blob.arrayBuffer(), name: `${fileBase}.png` });
      setSent(true);
    })();
    return () => {
      live = false;
    };
  }, [mode, remote.status, ready]);

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg(`${label} didn't work: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const png = () => act('PNG', async () => download(await renderPng(), `${fileBase}.png`));
  const gif = () =>
    act('GIF', async () => download(await makeStripGif({ template, cust, images, labels, score }), `${fileBase}.gif`));
  const copy = () =>
    act('Copy', async () => {
      if (!('ClipboardItem' in window)) throw new Error('this browser cannot copy images');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng() })]);
      setMsg('Copied to clipboard.');
    });
  const share = () =>
    act('Share', async () => {
      const file = new File([await renderPng()], `${fileBase}.png`, { type: 'image/png' });
      if (!navigator.canShare?.({ files: [file] })) throw new Error('sharing files is not supported here');
      await navigator.share({ files: [file], title: APP_NAME }).catch((e: Error) => {
        if (e.name !== 'AbortError') throw e;
      });
    });

  const canShare = typeof navigator.canShare === 'function';

  return (
    <section className="screen split">
      <div className="split-main">
        <StripPreview template={template} cust={cust} images={images} labels={labels} className="strip-big strip-final" />
      </div>
      <aside className="split-side">
        <p className="kicker">★ STAGE CLEAR ★</p>
        <h2>SAVE YOUR STRIP</h2>
        <div className="export-actions">
          <Button variant="primary" big onClick={png} disabled={!!busy || !ready}>
            {busy === 'PNG' ? 'RENDERING…' : 'DOWNLOAD PNG'}
          </Button>
          <Button variant="lime" onClick={gif} disabled={!!busy || !ready}>
            {busy === 'GIF' ? 'MAKING GIF…' : 'DOWNLOAD GIF'}
          </Button>
          <Button onClick={copy} disabled={!!busy || !ready}>
            COPY IMAGE
          </Button>
          {canShare && (
            <Button onClick={share} disabled={!!busy || !ready}>
              SHARE…
            </Button>
          )}
        </div>
        {msg && <p className={msg.includes("didn't") ? 'warn' : 'ok'}>{msg}</p>}
        {mode === 'remote' && (
          <p className={sent ? 'ok' : 'muted'}>
            {sent ? '★ Sent to Player 2 ★' : remote.status === 'connected' ? 'Sending to Player 2…' : 'Player 2 is offline.'}
          </p>
        )}
        <p className="muted small">
          PNG exports at {EXPORT_SCALE}× size, e.g. 1200 × 3600 px for a classic strip (sharp at 2×6 in, 300 dpi). Sharing sends the image to the app you pick, so check
          with everyone in the photo first.
        </p>
        <div className="row wrap push">
          <Button onClick={() => go('customize')}>◀ EDIT MORE</Button>
          <Button variant="danger" onClick={reset}>
            PLAY AGAIN
          </Button>
        </div>
      </aside>
    </section>
  );
}
