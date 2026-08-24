import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { AuthUser } from '../api/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (email: string, password: string, expectedRole?: AuthUser['role']) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = 'hubgym.token';
const STORAGE_USER = 'hubgym.user';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TOKEN),
          AsyncStorage.getItem(STORAGE_USER)
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as AuthUser);
          setStatus('authenticated');
          return;
        }
      } catch {
        // ignore restore errors
      }

      setToken(null);
      setUser(null);
      setStatus('unauthenticated');
    };

    restore();
  }, []);

  const signIn = async (email: string, password: string, expectedRole?: AuthUser['role']) => {
    const result = await api.login(email, password);
    if (expectedRole && result.user.role !== expectedRole) {
      throw new Error('Perfil selecionado nao confere com as credenciais.');
    }
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    await Promise.all([
      AsyncStorage.setItem(STORAGE_TOKEN, result.token),
      AsyncStorage.setItem(STORAGE_USER, JSON.stringify(result.user))
    ]);
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_TOKEN),
      AsyncStorage.removeItem(STORAGE_USER)
    ]);
  };

  const updateUser = async (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_USER, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ token, user, status, signIn, signOut, updateUser }),
    [token, user, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
