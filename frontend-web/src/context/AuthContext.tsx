import React, { createContext, useContext, useState } from 'react';
import { TokenResponse, UsuarioCreate } from '../types/api';
import { apiService } from '../services/api';

interface AuthContextValue {
  session: TokenResponse | null;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (datos: UsuarioCreate) => Promise<TokenResponse>;
  logout: () => void;
}

const STORAGE_KEY = 'edtech_session';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TokenResponse | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as TokenResponse) : null;
    } catch {
      return null;
    }
  });

  const saveSession = (data: TokenResponse) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSession(data);
  };

  const login = async (email: string, password: string) => {
    const res = await apiService.login(email, password);
    saveSession(res);
    return res;
  };

  const register = async (datos: UsuarioCreate) => {
    const res = await apiService.register(datos);
    saveSession(res);
    return res;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return ctx;
}