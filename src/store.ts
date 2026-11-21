import { create } from 'zustand';
import type { CaptureSettings, Customization, Look, Mode, Shot, Step, Sticker } from './types';
import { getTemplate } from './lib/templates';
import { processShot, revokeShot } from './lib/process';

export const STEPS: { id: Step; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'template', label: 'Template' },
  { id: 'booth', label: 'Shoot' },
  { id: 'peek', label: 'Peek' },
  { id: 'glow', label: 'Glow' },
  { id: 'customize', label: 'Style' },
  { id: 'export', label: 'Save' },
];

const SETTINGS_KEY = 'oh-snap-settings';

function loadSettings(): CaptureSettings {
  const base: CaptureSettings = {
    countdown: 3,
    flash: true,
    light: false,
    sound: true,
    mirror: true,
    burst: false,
    facing: 'user',
    filter: 0,
    effect: 'none',
    background: 'none',
  };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return base;
  }
}

function custFor(templateId: string, prev?: Customization): Customization {
  const t = getTemplate(templateId);
  return {
    ...t.defaults,
    colors: { ...t.defaults.colors },
    subtitle: prev?.subtitle ?? '',
    showDate: prev?.showDate ?? true,
    showScore: prev?.showScore ?? t.collection !== 'coquette',
    stickers: [],
    sprinkles: t.collection === 'coquette' ? ['hearts'] : t.collection === 'kawaii' ? ['strawberries', 'hearts'] : t.collection === 'dream' ? ['stars'] : [],
  };
}

const randomScore = () => `SCORE ${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`;

interface State {
  step: Step;
  furthest: number;
  mode: Mode;
  players: string[];
  templateId: string;
  cust: Customization;
  shots: Shot[];
  slotMap: (number | null)[];
  settings: CaptureSettings;
  score: string;
  /** Shot index the booth should retake as soon as the camera is live, then return to Peek. */
  pendingRetake: number | null;
  /** The user has turned the camera on this session. */
  camOn: boolean;
  setCamOn(v: boolean): void;
  setPendingRetake(i: number | null): void;
  setLooks(indices: number[], look: Partial<Look>): Promise<void>;
  go(step: Step): void;
  setMode(mode: Mode, players?: string[]): void;
  setPlayers(players: string[]): void;
  pickTemplate(id: string): void;
  patchCust(p: Partial<Customization>): void;
  setSlotCount(n: number): void;
  patchSettings(p: Partial<CaptureSettings>): void;
  setShot(index: number, shot: Shot): void;
  clearShots(): void;
  assignSlot(slot: number, shot: number | null): void;
  swapSlots(a: number, b: number): void;
  addSticker(s: Sticker): void;
  updateSticker(id: string, p: Partial<Sticker>): void;
  removeSticker(id: string): void;
  reset(): void;
}

const DEFAULT_TEMPLATE = 'coquette-strip';

export const useStore = create<State>((set, get) => ({
  step: 'start',
  furthest: 0,
  mode: 'solo',
  players: ['PLAYER 1'],
  templateId: DEFAULT_TEMPLATE,
  cust: custFor(DEFAULT_TEMPLATE),
  shots: [],
  slotMap: [0, 1, 2, 3],
  settings: loadSettings(),
  score: randomScore(),
  pendingRetake: null,
  camOn: false,
  setCamOn(v) {
    set({ camOn: v });
  },
  setPendingRetake(i) {
    set({ pendingRetake: i });
  },
  async setLooks(indices, patch) {
    // Record the new look right away so later edits build on it, then render in the background.
    const shots = [...get().shots];
    const jobs: { i: number; id: string; look: Look; raw: string; fx?: string }[] = [];
    for (const i of indices) {
      const cur = shots[i];
      if (!cur) continue;
      const look = { ...cur.look, ...patch };
      shots[i] = { ...cur, look };
      jobs.push({ i, id: cur.id, look, raw: cur.raw, fx: cur.fx });
    }
    set({ shots });
    await Promise.all(
      jobs.map(async (j) => {
        const url = await processShot(j.raw, j.fx, j.look);
        const cur = get().shots[j.i];
        if (!cur || cur.id !== j.id || cur.look !== j.look) {
          URL.revokeObjectURL(url); // a newer edit is on its way
          return;
        }
        const next = [...get().shots];
        URL.revokeObjectURL(cur.url);
        next[j.i] = { ...cur, url };
        set({ shots: next });
      })
    );
  },

  go(step) {
    const i = STEPS.findIndex((s) => s.id === step);
    set({ step, furthest: Math.max(get().furthest, i) });
    window.scrollTo({ top: 0 });
  },
  setMode(mode, players) {
    const p = players ?? (mode === 'solo' ? ['PLAYER 1'] : ['PLAYER 1', 'PLAYER 2']);
    set({ mode, players: p });
    const cust = get().cust;
    if (mode !== 'solo' && !cust.subtitle) set({ cust: { ...cust, subtitle: p.join(' · ') } });
    if (mode === 'solo' && cust.subtitle.includes('·')) set({ cust: { ...cust, subtitle: '' } });
  },
  setPlayers(players) {
    set({ players, cust: { ...get().cust, subtitle: players.join(' · ') } });
  },
  pickTemplate(id) {
    const prev = get().cust;
    const cust = custFor(id, prev);
    const t = getTemplate(id);
    // Keep the shot count the user already shot if the new layout supports it
    if (get().shots.length && [2, 3, 4, 6].includes(get().shots.length) && !(t.layout === 'wide' && get().shots.length > 4))
      cust.slotCount = get().shots.length;
    set({ templateId: id, cust, slotMap: identity(cust.slotCount, get().shots.length) });
  },
  patchCust(p) {
    set({ cust: { ...get().cust, ...p } });
  },
  setSlotCount(n) {
    const { slotMap, shots } = get();
    const next = Array.from({ length: n }, (_, i) => slotMap[i] ?? (i < shots.length ? i : null));
    set({ cust: { ...get().cust, slotCount: n }, slotMap: next });
  },
  patchSettings(p) {
    const settings = { ...get().settings, ...p };
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, effect: 'none' }));
    } catch {
      /* storage unavailable */
    }
  },
  setShot(index, shot) {
    const shots = [...get().shots];
    const old = shots[index];
    if (old && old.id !== shot.id) revokeShot(old);
    shots[index] = shot;
    set({ shots, slotMap: identity(get().cust.slotCount, shots.length, get().slotMap) });
  },
  clearShots() {
    get().shots.forEach((s) => s && revokeShot(s));
    set({ shots: [], slotMap: identity(get().cust.slotCount, 0), score: randomScore() });
  },
  assignSlot(slot, shot) {
    const m = [...get().slotMap];
    m[slot] = shot;
    set({ slotMap: m });
  },
  swapSlots(a, b) {
    const m = [...get().slotMap];
    [m[a], m[b]] = [m[b], m[a]];
    set({ slotMap: m });
  },
  addSticker(s) {
    set({ cust: { ...get().cust, stickers: [...get().cust.stickers, s] } });
  },
  updateSticker(id, p) {
    set({ cust: { ...get().cust, stickers: get().cust.stickers.map((s) => (s.id === id ? { ...s, ...p } : s)) } });
  },
  removeSticker(id) {
    set({ cust: { ...get().cust, stickers: get().cust.stickers.filter((s) => s.id !== id) } });
  },
  reset() {
    get().clearShots();
    set({ step: 'start', furthest: 0, cust: custFor(get().templateId), camOn: false });
  },
}));

function identity(n: number, shotCount: number, prev?: (number | null)[]) {
  return Array.from({ length: n }, (_, i) => {
    const p = prev?.[i];
    if (p !== undefined && p !== null && p < shotCount) return p;
    return i < shotCount ? i : null;
  });
}

export const uid = () => Math.random().toString(36).slice(2, 10);
