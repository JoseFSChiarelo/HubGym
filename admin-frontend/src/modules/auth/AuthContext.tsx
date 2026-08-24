import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
    athleteId?: string;
    personalId?: string;
    avatarUrl?: string | null;
  } | null;
}

interface AuthContextProps extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<AuthState['user']>) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const target = import.meta.env.VITE_CLIENT_TARGET ?? 'web';
const isDesktopApp =
  target === 'desktop' ||
  (typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('electron'));
const allowedRoles = isDesktopApp ? ['ADMIN', 'PERSONAL'] : ['PERSONAL', 'ATHLETE'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : { token: null, user: null };
  });

  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(state));
  }, [state]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!allowedRoles.includes(data.user.role)) {
      throw new Error('Acesso não permitido para este app');
    }
    setState({ token: data.token, user: data.user });
    if (data.user.role === 'ADMIN') {
      navigate('/admin');
    } else if (data.user.role === 'PERSONAL') {
      navigate('/personal');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    setState({ token: null, user: null });
    localStorage.removeItem('auth');
    navigate('/login');
  };

  const updateUser = (updates: Partial<AuthState['user']>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      return { ...prev, user: { ...prev.user, ...updates } };
    });
  };

  const value = useMemo(() => ({ ...state, login, logout, updateUser }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
