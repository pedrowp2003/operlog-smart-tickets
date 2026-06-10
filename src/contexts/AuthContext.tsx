/**
 * AuthContext
 * -----------
 * Contexto global de autenticação do OperLog.
 * Centraliza: sessão do Supabase, perfil do usuário logado, login/logout,
 * cadastro, atualização de perfil/email/senha, exclusão de conta e upload
 * de imagens. Qualquer componente acessa via o hook useAuth().
 */

// Importa primitivos do React usados no provider (contexto, estado, efeito, tipos).
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Cliente Supabase já configurado (URL + anon key) — usado para auth, DB e storage.
import { supabase } from '@/integrations/supabase/client';
// Tipos gerados automaticamente a partir do schema do banco.
import type { Tables } from '@/integrations/supabase/types';
// Função que traduz mensagens de erro do Supabase Auth para português.
import { translateAuthError } from '@/lib/auth-errors';
// Validador que garante a política de senha (mín. 8, maiúscula, número, símbolo).
import { validatePassword } from '@/lib/password';

// Tipo do perfil = linha da tabela `profiles` no banco.
export type Profile = Tables<'profiles'>;

// Formato do valor exposto pelo contexto — define a API pública do AuthProvider.
interface AuthContextType {
  user: Profile | null;                                                                                          // Perfil do usuário logado, ou null se deslogado.
  loading: boolean;                                                                                              // True enquanto resolve a sessão inicial.
  login: (email: string, password: string) => Promise<string | null>;                                            // Login por email/senha. Retorna msg de erro ou null em sucesso.
  loginWithUsername: (username: string, password: string) => Promise<string | null>;                             // Login alternativo por username (resolve email no servidor).
  register: (email: string, password: string, metadata: Record<string, string | undefined>) => Promise<string | null>; // Cadastro novo (analista master).
  logout: () => Promise<void>;                                                                                   // Encerra a sessão atual.
  updateProfile: (updates: Partial<Profile>) => Promise<void>;                                                   // Atualiza campos da tabela profiles.
  updateEmail: (newEmail: string) => Promise<string | null>;                                                     // Troca email no Auth e em profiles.
  updatePassword: (newPassword: string) => Promise<string | null>;                                               // Troca a senha do usuário logado.
  deleteAccount: () => Promise<void>;                                                                            // Apaga o perfil e desloga.
  uploadImage: (file: File, path: string) => Promise<string | null>;                                             // Faz upload para o bucket `images` e devolve URL pública.
}

// Cria o contexto React. Inicia como null e é populado pelo AuthProvider.
const AuthContext = createContext<AuthContextType | null>(null);

// Provider que envolve a aplicação (configurado em App.tsx) e expõe o contexto.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado: perfil do usuário logado (null = ninguém logado ainda).
  const [user, setUser] = useState<Profile | null>(null);
  // Estado: indica que ainda estamos resolvendo a sessão inicial (evita flash de tela).
  const [loading, setLoading] = useState(true);

  // Helper interno: busca a linha de profiles correspondente ao auth.users.id.
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  };

  // Efeito de inicialização: assina mudanças de sessão e carrega a sessão existente.
  useEffect(() => {
    // Assinatura: dispara em login, logout, refresh de token, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Há sessão ativa: marca loading e busca o profile de forma assíncrona.
        setLoading(true);
        // setTimeout(0) defer evita deadlock dentro do callback do Supabase.
        setTimeout(async () => {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
          setLoading(false);
        }, 0);
      } else {
        // Sem sessão: limpa o estado e libera o app.
        setUser(null);
        setLoading(false);
      }
    });

    // Carga inicial: busca a sessão já salva no localStorage (caso o usuário recarregue).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    // Cleanup: cancela a assinatura quando o provider é desmontado.
    return () => subscription.unsubscribe();
  }, []);

  // Login padrão por email/senha. Retorna mensagem de erro traduzida ou null.
  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return translateAuthError(error.message);
    return null;
  };

  // Login alternativo aceitando username — resolve o email via função RPC no banco.
  const loginWithUsername = async (username: string, password: string): Promise<string | null> => {
    // RPC `get_email_by_username` é SECURITY DEFINER, então respeita as regras de privacidade.
    const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', { _username: username });
    if (lookupError || !email) return 'Usuário não encontrado';
    // Com o email resolvido, faz o signIn normal.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return 'Usuário ou senha inválidos';
    return null;
  };

  // Cadastra um novo usuário diretamente no Auth (usado apenas pelo analista master).
  const register = async (email: string, password: string, metadata: Record<string, string | undefined>): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // metadata é copiado para raw_user_meta_data e usado pelo trigger que cria o profile.
      options: { data: metadata },
    });
    if (error) return translateAuthError(error.message);
    return null;
  };

  // Logout: encerra a sessão no Supabase e limpa o estado local.
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Atualiza campos do profile do usuário logado e sincroniza o estado local.
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return; // Segurança: não faz nada se não houver usuário.
    const { data } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (data) setUser(data);
  };

  // Atualiza o email tanto no Auth quanto na tabela profiles (mantém em sincronia).
  const updateEmail = async (newEmail: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return translateAuthError(error.message);
    // Replica em profiles para que listagens/exibições mostrem o novo email.
    if (user) {
      await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id);
    }
    return null;
  };

  // Atualiza a senha aplicando a política de complexidade antes de chamar o Auth.
  const updatePassword = async (newPassword: string): Promise<string | null> => {
    const v = validatePassword(newPassword);
    if (v) return v; // Falhou na validação local — retorna a mensagem.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return translateAuthError(error.message);
    return null;
  };

  // Apaga o profile do usuário e encerra a sessão. (Auth user é tratado por triggers.)
  const deleteAccount = async () => {
    if (!user) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    setUser(null);
  };

  // Upload genérico de imagem para o bucket `images`. Retorna URL pública ou null.
  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();                                  // Extrai a extensão original.
    const filePath = `${path}/${crypto.randomUUID()}.${fileExt}`;                // Nome único evita colisões.
    const { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);     // Bucket público → URL acessível.
    return data.publicUrl;
  };

  // Expõe a API completa para a árvore de componentes filha.
  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithUsername, register, logout, updateProfile, updateEmail, updatePassword, deleteAccount, uploadImage }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook utilitário para consumir o AuthContext.
 * Lança erro se for usado fora do AuthProvider — ajuda a pegar bugs cedo.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
