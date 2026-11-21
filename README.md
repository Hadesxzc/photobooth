# Insert Smile — Arcade Photobooth

A free, no-account photobooth that runs entirely in the browser, built from the *Online Photobooth PRD*. "Insert Smile" is a working title; change it in `src/config.ts`.

## Run it

```bash
npm install      # also copies MediaPipe's WASM into public/mediapipe
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy to any static host + CDN)
```

The camera needs HTTPS or localhost. To test on a phone over your LAN, deploy a preview build or use an HTTPS tunnel.

## What's in it

| PRD | Feature | Where |
| --- | --- | --- |
| F1–F3 | Mirrored live camera, 3/5/10 s progress-bar countdown, 2–6 shots, retake any shot, upload instead, burst mode, switch camera, flash and shutter sound toggles | `screens/Booth.tsx`, `components/CameraView.tsx` |
| F4 | 12 WebGL look filters, baked into the saved shot | `lib/filters.ts` |
| F5 | 10 face-tracked pixel effects (MediaPipe Face Landmarker, loaded on demand) with a frame-rate guard that falls back to look filters | `lib/effects.ts`, `lib/face.ts` |
| F6–F7 | 30 templates (6 collections × 5 layouts), defined as data and drawn in the browser | `lib/templates.ts`, `lib/compose.ts` |
| F8–F9 | Recolor (themes + 5 color tokens), title/caption, 7 fonts, date and score lines, 18 draggable stickers, slot count, patterns, borders, swap photos between slots | `screens/Customize.tsx`, `screens/Arrange.tsx` |
| F10–F11 | PNG at 2× (1200 × 3600 for a classic strip), animated GIF, copy to clipboard, native share sheet | `screens/Export.tsx`, `lib/gif.ts` |
| F12 | Together mode: 2–4 named players taking turns, with P1/P2 labels on the strip | `screens/Start.tsx` |
| F13 | Online co-op: invite link, live video of each other, Player 2 shoots on their own camera, finished strip sent back | `lib/remote.ts`, `screens/Guest.tsx` |
| F16 | Installable PWA with an offline shell | `public/manifest.webmanifest`, `public/sw.js` |

## Privacy

- Photos are captured, filtered and composed on the device. Nothing is uploaded.
- Face landmarks stay in memory and are never stored or sent. The face model file is downloaded from Google's MediaPipe CDN on first use.
- Online co-op uses WebRTC. PeerJS's free public broker only exchanges connection details, and video and photos go peer to peer. For production, run your own PeerServer and TURN server.

## Not built yet (needs a backend or third-party account)

- **F14 Expiring share links**: needs object storage with auto-expiry.
- **F15 Edit in Canva**: needs a registered Canva Connect API app.
- **Designer templates from Canva**: templates are drawn in code right now. To use Canva art, add image layers to a template (background/frame PNG or SVG) and draw them in `compose.ts` around the photo slots. The manifest shape in `lib/templates.ts` is already the slot/text/color-token format the PRD describes.

## Project layout

```
src/
  App.tsx               step router + top bar
  store.ts              app state (zustand)
  config.ts             name, brand tokens, fonts, export scale
  lib/                  camera, filters (WebGL), face tracking, effects, sprites,
                        templates, compositor, GIF, sounds, remote (WebRTC)
  components/           CameraView, StripPreview, Countdown, UI kit
  screens/              Start, Templates, Booth, Arrange, Customize, Export, Guest
```
