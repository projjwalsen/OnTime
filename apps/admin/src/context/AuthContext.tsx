'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, isDistributorAdmin } from '@ontime/shared';
import { api } from '../lib/api';
import { STORAGE_KEYS } from '../lib/config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from local storage and verify with backend
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        const res = await api.getMe();
        if (res.success && res.data?.user) {
          // Strictly verify role is DISTRIBUTOR_ADMIN
          if (!isDistributorAdmin(res.data.user.role)) {
            console.warn('[Auth] Non-distributor user detected in admin portal. Logging out.');
            await api.logout();
            setUser(null);
          } else {
            setUser(res.data.user);
          }
        } else {
          // Token invalid or expired
          await api.logout();
          setUser(null);
        }
      } catch (err) {
        console.error('[Auth] Init failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    void initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await api.login({ email, password });

        if (!res.success || !res.data) {
          return {
            success: false,
            error: res.error || 'Invalid email or password',
          };
        }

        const loggedInUser = res.data.user;

        // Strictly enforce DISTRIBUTOR_ADMIN only
        if (!isDistributorAdmin(loggedInUser.role)) {
          await api.logout();
          return {
            success: false,
            error:
              'Access restricted: This admin panel is exclusively for Distributor Administrators. Retailer users cannot sign in here.',
          };
        }

        setUser(loggedInUser);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        return { success: false, error: msg };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data?.user) {
        if (isDistributorAdmin(res.data.user.role)) {
          setUser(res.data.user);
        }
      }
    } catch (err) {
      console.error('[Auth] refreshUser error:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && isDistributorAdmin(user.role),
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
