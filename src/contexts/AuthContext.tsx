import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  loginWithUsername: (username: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, metadata: Record<string, string | undefined>) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
  deleteAccount: () => Promise<void>;
  uploadImage: (file: File, path: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const loginWithUsername = async (username: string, password: string): Promise<string | null> => {
    // Look up email by username using database function
    const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', { _username: username });
    if (lookupError || !email) return 'Usuário não encontrado';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return 'Usuário ou senha inválidos';
    return null;
  };

  const register = async (email: string, password: string, metadata: Record<string, string | undefined>): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return error.message;
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (data) setUser(data);
  };

  const updateEmail = async (newEmail: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return error.message;
    // Also update in profiles
    if (user) {
      await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id);
    }
    return null;
  };

  const updatePassword = async (newPassword: string): Promise<string | null> => {
    if (newPassword.length < 8) return 'A senha deve ter no mínimo 8 dígitos';
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    return null;
  };

  const deleteAccount = async () => {
    if (!user) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    setUser(null);
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${path}/${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithUsername, register, logout, updateProfile, updateEmail, updatePassword, deleteAccount, uploadImage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
