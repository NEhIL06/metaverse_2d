import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth';
import { authAPI } from '@/lib/api';
import type { SignUpRequest, SignInRequest } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // actions
  signUp: (data: SignUpRequest) => Promise<void>;
  signIn: (data: SignInRequest) => Promise<void>;
  signOut: () => void;
  setLoading: (v: boolean) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      hydrate: () => {
        // Token and user are loaded automatically by persist middleware.
        // Just mark loading complete.
        set({ isLoading: false });
      },

      setLoading: (v) => set({ isLoading: v }),

      signUp: async (data) => {
        const response = await authAPI.signUp(data);
        const userData: User = {
          id: response.userId,
          username: data.username,
          type: data.type,
        };
        set({ user: userData, token: response.token, isAuthenticated: true });
        // Keep legacy localStorage keys in sync so Office.tsx can read token
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));
      },

      signIn: async (data) => {
        const response = await authAPI.signIn(data);
        const userData: User = {
          id: response.userId,
          username: data.username,
          type: 'admin',
        };
        set({ user: userData, token: response.token, isAuthenticated: true });
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));
      },

      signOut: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },
    }),
    {
      name: 'metaverse-auth', // localStorage key
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
