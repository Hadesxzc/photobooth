// Synthesized chiptune-style sounds; no audio files needed.
let ac: AudioContext | null = null;
const ctx = () => (ac ??= new AudioContext());

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, delay = 0) {
  const a = ctx();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  unlock() {
    void ctx().resume();
  },
  tick() {
    tone(660, 0.08);
  },
  go() {
    tone(990, 0.12);
  },
  shutter() {
    const a = ctx();
    const len = a.sampleRate * 0.12;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = 0.25;
    src.buffer = buf;
    src.connect(g).connect(a.destination);
    src.start();
    tone(1760, 0.05, 'square', 0.05, 0.02);
  },
  coin() {
    tone(988, 0.08, 'square', 0.07);
    tone(1319, 0.3, 'square', 0.07, 0.08);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.1));
  },
  blip() {
    tone(440, 0.05, 'triangle', 0.08);
  },
};
