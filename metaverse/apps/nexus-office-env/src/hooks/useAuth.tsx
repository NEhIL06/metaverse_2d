import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { User, SignUpRequest, SignInRequest } from '@/types/auth';
import { useToast } from './use-toast';

// ──────────────────────────────────────────────────────────────────
// Context (kept for backward compat — components that call useAuth()
// continue to work without changes, while the store is the source of truth)
// ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUp: (data: SignUpRequest) => Promise<void>;
  signIn: (data: SignInRequest) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();
  const { toast } = useToast();

  // Mark hydration complete on mount (persist middleware restores state synchronously)
  useEffect(() => {
    store.hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (data: SignUpRequest) => {
    try {
      await store.signUp(data);
      toast({
        title: 'Account created',
        description: 'Welcome to Virtual Office!',
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to create account';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signIn = async (data: SignInRequest) => {
    try {
      await store.signIn(data);
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in.',
      });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.response?.data?.message || 'Failed to sign in';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = () => {
    store.signOut();
    toast({
      title: 'Signed out',
      description: 'See you next time!',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: store.user,
        isLoading: store.isLoading,
        signUp,
        signIn,
        signOut,
        isAuthenticated: store.isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}