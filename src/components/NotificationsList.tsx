/**
 * NotificationsList
 * -----------------
 * Lista de notificações in-app do usuário logado.
 * - Faz fetch das últimas 50 notificações.
 * - Escuta mudanças em tempo real via Realtime do Supabase.
 * - Permite marcar todas como lidas ou apagar uma a uma.
 * Também exporta `useUnreadCount` para o badge no cabeçalho do Dashboard.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2 } from 'lucide-react';

// Formato local das notificações (subset das colunas da tabela).
interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Converte uma data ISO em string relativa curta ("agora", "5min", "2h", "3d").
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// `compact` reduz tamanhos/espaçamentos quando a lista vive dentro de um Sheet mobile.
export function NotificationsList({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  // Derivado do estado — quantas notificações ainda não foram lidas.
  const unread = items.filter(i => !i.read).length;

  // Busca as últimas 50 notificações do usuário atual.
  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setItems(data as Notification[]);
  };

  // Carrega na montagem e assina mudanças em tempo real (insert/update/delete).
  useEffect(() => {
    if (!user) return;
    load();
    // Nome do canal único por sessão evita colisão entre abas/instâncias.
    const channel = supabase
      .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    // Cleanup: descarta o canal Realtime quando o componente desmonta.
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Marca todas as notificações não lidas como lidas no banco.
  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    load();
  };

  // Exclui uma notificação específica (atualização otimista no estado local).
  const removeOne = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setItems(prev => prev.filter(n => n.id !== id));
  };

  const markOne = async (n: Notification) => {
    if (!n.read) await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    load();
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className={`flex items-center justify-between ${compact ? 'pr-8' : ''}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="w-4 h-4" />
          <span>Notificações</span>
          {!compact && unread > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        {items.some(i => !i.read) && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
            <Check className="w-3 h-3 mr-1" /> Marcar todas
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Você não tem notificações.</p>
        )}
        {items.map(n => (
          <button
            key={n.id}
            onClick={() => markOne(n)}
            className={`text-left rounded-md p-2 border transition-colors ${n.read ? 'bg-background border-border' : 'bg-accent/40 border-accent'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground break-words">{n.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                <Trash2
                  className="w-3 h-3 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count: c } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setCount(c || 0);
    };
    load();
    const channel = supabase
      .channel(`notif-count:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
  return count;
}