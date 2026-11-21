import { create } from 'zustand';
import type { DataConnection, MediaConnection, Peer as PeerT } from 'peerjs';
import { currentStream } from './camera';

// Remote co-op: peer-to-peer over WebRTC. PeerJS's public broker is used only to exchange
// connection details; photos and video go directly between the two browsers.

export type RemoteMsg =
  | { t: 'hello'; templateId: string; players: string[] }
  | { t: 'shoot'; index: number; countdown: number }
  | { t: 'status'; text: string }
  | { t: 'shot'; index: number; data: ArrayBuffer }
  | { t: 'strip'; data: ArrayBuffer; name: string }
  | { t: 'name'; name: string };

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

/** Host side: ask the guest to take shot `index` and wait for the JPEG. */
export function requestGuestShot(index: number, countdown: number): Promise<Blob> {
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
        resolve(new Blob([m.data], { type: 'image/jpeg' }));
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
