import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getUserByUsername, addUser as storeAddUser, updateUser as storeUpdateUser, deleteUser as storeDeleteUser } from '@/data/store';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  register: (user: User) => boolean;
  logout: () => void;
  updateProfile: (user: User) => void;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('operlog_current_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const found = getUserByUsername(username);
    if (found && found.password === password) {
      setUser(found);
      localStorage.setItem('operlog_current_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const register = (newUser: User): boolean => {
    const existing = getUserByUsername(newUser.username);
    if (existing) return false;
    storeAddUser(newUser);
    setUser(newUser);
    localStorage.setItem('operlog_current_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('operlog_current_user');
  };

  const updateProfile = (updated: User) => {
    storeUpdateUser(updated);
    setUser(updated);
    localStorage.setItem('operlog_current_user', JSON.stringify(updated));
  };

  const deleteAccount = () => {
    if (user) {
      storeDeleteUser(user.id);
      setUser(null);
      localStorage.removeItem('operlog_current_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
