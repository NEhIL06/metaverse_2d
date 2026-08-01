import { create } from 'zustand';
import type { Space } from '@/types/space';
import { spaceAPI } from '@/lib/api';

interface SpaceState {
  spaces: Space[];
  isLoading: boolean;
  error: string | null;

  // actions
  fetchSpaces: () => Promise<void>;
  addSpace: (space: Space) => void;
  removeSpace: (spaceId: string) => void;
  clearError: () => void;
}

export const useSpaceStore = create<SpaceState>((set) => ({
  spaces: [],
  isLoading: false,
  error: null,

  fetchSpaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await spaceAPI.getAll();
      set({ spaces: response.spaces, isLoading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load spaces';
      set({ error: msg, isLoading: false });
    }
  },

  addSpace: (space) =>
    set((state) => ({ spaces: [...state.spaces, space] })),

  removeSpace: async (spaceId) => {
    // optimistic remove
    set((state) => ({ spaces: state.spaces.filter((s) => s.id !== spaceId) }));
    try {
      await spaceAPI.delete(spaceId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete space';
      set({ error: msg });
      // Re-fetch to reconcile
    }
  },

  clearError: () => set({ error: null }),
}));
