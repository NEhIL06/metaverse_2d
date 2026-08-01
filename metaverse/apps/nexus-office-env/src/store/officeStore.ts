import { create } from 'zustand';

export type UserEntry = { x: number; y: number; userId: string };
export type UserMap = Map<string, UserEntry>;

export interface ChatMessage {
  userId: string;
  message: string;
  timestamp: number;
}

interface OfficeState {
  // arena dimensions
  arenaWidth: number;
  arenaHeight: number;

  // current logged-in user position
  currentUser: { x: number; y: number; userId?: string } | null;

  // other users in the space
  users: UserMap;

  // group chat
  messages: ChatMessage[];

  // WebRTC call state
  inCallWith: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // connection status
  wsConnected: boolean;

  // --- actions ---
  setArenaDimensions: (w: number, h: number) => void;
  setCurrentUser: (user: { x: number; y: number; userId?: string } | null) => void;
  updateCurrentUserPos: (x: number, y: number) => void;

  upsertUser: (entry: UserEntry) => void;
  removeUser: (userId: string) => void;
  updateUserPos: (userId: string, x: number, y: number) => void;
  clearUsers: () => void;

  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  setInCallWith: (userId: string | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;

  setWsConnected: (v: boolean) => void;

  // full reset when leaving the office
  resetOffice: () => void;
}

const defaultState = {
  arenaWidth: 10,
  arenaHeight: 8,
  currentUser: null,
  users: new Map<string, UserEntry>(),
  messages: [] as ChatMessage[],
  inCallWith: null,
  localStream: null,
  remoteStream: null,
  wsConnected: false,
};

export const useOfficeStore = create<OfficeState>((set, get) => ({
  ...defaultState,

  setArenaDimensions: (w, h) => set({ arenaWidth: w, arenaHeight: h }),

  setCurrentUser: (user) => set({ currentUser: user }),

  updateCurrentUserPos: (x, y) =>
    set((s) => ({
      currentUser: s.currentUser ? { ...s.currentUser, x, y } : s.currentUser,
    })),

  upsertUser: (entry) =>
    set((s) => {
      const newUsers = new Map(s.users);
      newUsers.set(entry.userId, entry);
      return { users: newUsers };
    }),

  removeUser: (userId) =>
    set((s) => {
      const newUsers = new Map(s.users);
      newUsers.delete(userId);
      return { users: newUsers };
    }),

  updateUserPos: (userId, x, y) =>
    set((s) => {
      const newUsers = new Map(s.users);
      const existing = newUsers.get(userId);
      if (existing) {
        newUsers.set(userId, { ...existing, x, y });
      } else {
        newUsers.set(userId, { userId, x, y });
      }
      return { users: newUsers };
    }),

  clearUsers: () => set({ users: new Map() }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  setInCallWith: (userId) => set({ inCallWith: userId }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  setWsConnected: (v) => set({ wsConnected: v }),

  resetOffice: () =>
    set({
      ...defaultState,
      users: new Map<string, UserEntry>(),
    }),
}));
