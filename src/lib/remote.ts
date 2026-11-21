import { create } from 'zustand';
import type { DataConnection, MediaConnection, Peer as PeerT } from 'peerjs';
import { currentStream } from './camera';
import type { BackgroundId } from '../types';

// Remote co-op: peer-to-peer over WebRTC. PeerJS's public broker is used only to exchange
// connection details; photos and video go directly between the two browsers.

export type RemoteMsg =
  | { t: 'hello'; templateId: string; players: string[]; aspect?: number }
  | { t: 'shoot'; index: number; countdown: number }
  | { t: 'status'; text: string }
  | { t: 'shot'; index: number; data: ArrayBuffer; fx?: ArrayBuffer }
  | { t: 'strip'; data: ArrayBuffer; name: string }
  | { t: 'name'; name: string }
  | { t: 'look'; filter: number; background: BackgroundId };

interface RemoteState {
  role: 'host' | 'guest' | null;
  status: 'idle' | 'opening' | 'waiting' | 'connected' | 'closed' | 'error';
  link: string;
  error: string;
  remoteStream: MediaStream | null;
}

export const useRemote = create<RemoteState>(() => ({
  role: null,
  status: 'idle',
  link: '',
  error: '',
  remoteStream: null,
}));

let peer: PeerT | null = null;
let conn: DataConnection | null = null;
let call: MediaConnection | null = null;
const listeners = new Set<(m: RemoteMsg) => void>();

const set = useRemote.setState;

/** Keep the live call sharp and steady: enough bitrate for a clear face, balanced between detail and frame rate.
 *  Photos are sent separately at full quality. */
function tune(c: MediaConnection) {
  const apply = () => {
    const pc = c.peerConnection;
    if (!pc) return;
    for (const sender of pc.getSenders()) {
      const track = sender.track;
      if (!track || track.kind !== 'video') continue;
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      params.encodings[0].maxFramerate = 30;
      params.encodings[0].maxBitrate = 2_500_000;
      (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'balanced';
      sender.setParameters(params).catch(() => undefined);
    }
  };
  c.on('stream', apply);
  setTimeout(apply, 1500);
}

async function newPeer() {
  const { Peer } = await import('peerjs');
  return new Peer();
}

function wire(c: DataConnection) {
  conn = c;
  c.on('open', () => set({ status: 'connected' }));
  c.on('data', (d) => listeners.forEach((fn) => fn(d as RemoteMsg)));
  c.on('close', () => {
    set({ status: 'closed', remoteStream: null });
    conn = null;
  });
  c.on('error', (e) => set({ status: 'error', error: String(e) }));
}

export async function hostSession() {
  leaveSession();
  set({ role: 'host', status: 'opening', error: '' });
  try {
    peer = await newPeer();
  } catch (e) {
    set({ status: 'error', error: String(e) });
    return;
  }
  peer.on('open', (id) => {
    const url = new URL(location.href);
    url.search = `?join=${id}`;
    url.hash = '';
    set({ status: 'waiting', link: url.toString() });
  });
  peer.on('connection', (c) => {
    if (conn) {
      c.on('open', () => c.close());
      return;
    }
    wire(c);
  });
  peer.on('error', (e) => set({ status: 'error', error: e.message }));
}

export async function joinSession(hostId: string) {
  leaveSession();
  set({ role: 'guest', status: 'opening', error: '' });
  try {
    peer = await newPeer();
  } catch (e) {
    set({ status: 'error', error: String(e) });
    return;
  }
  peer.on('open', () => wire(peer!.connect(hostId, { reliable: true })));
  peer.on('call', (incoming) => {
    call = incoming;
    incoming.answer(currentStream() ?? undefined);
    tune(incoming);
    incoming.on('stream', (s) => set({ remoteStream: s }));
  });
  peer.on('error', (e) =>
    set({ status: 'error', error: e.type === 'peer-unavailable' ? 'That session has ended or the link is wrong.' : e.message })
  );
}

/** Host side: start (or restart) the video call once the local camera is live. */
export function ensureCall(stream: MediaStream) {
  if (!peer || !conn || useRemote.getState().role !== 'host') return;
  if (call && call.open && call.localStream === stream) return;
  call?.close();
  call = peer.call(conn.peer, stream);
  tune(call);
  call.on('stream', (s) => set({ remoteStream: s }));
}

export function send(m: RemoteMsg) {
  if (conn?.open) void conn.send(m);
}

export function onMessage(fn: (m: RemoteMsg) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Host side: ask the guest to shoot `index` on the same countdown and wait for their frame. */
export function requestGuestShot(index: number, countdown: number): Promise<{ raw: Blob; fx?: Blob }> {
  send({ t: 'shoot', index, countdown });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      off();
      reject(new Error('Player 2 did not respond'));
    }, (countdown + 25) * 1000);
    const off = onMessage((m) => {
      if (m.t === 'shot' && m.index === index) {
        clearTimeout(timer);
        off();
        resolve({
          raw: new Blob([m.data], { type: 'image/jpeg' }),
          fx: m.fx ? new Blob([m.fx], { type: 'image/png' }) : undefined,
        });
      }
    });
  });
}

export function leaveSession() {
  call?.close();
  conn?.close();
  peer?.destroy();
  call = null;
  conn = null;
  peer = null;
  set({ role: null, status: 'idle', link: '', remoteStream: null });
}

export const isConnected = () => !!conn?.open;
