import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Notification = Tables<'notifications'>;

interface Props {
  compact?: boolean;
}

export function NotificationsPanel({ compact = false }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setItems(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchItems();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchItems()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };
  const remove = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
  };
  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  const unread = items.filter(i => !i.read).length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2 flex-1 overflow-y-auto'}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length === 0 ? 'Nenhuma notificação' : `${unread} não lida${unread === 1 ? '' : 's'}`}
        </p>
        {unread > 0 && (
          <button className="text-[11px] text-primary hover:underline" onClick={markAllRead}>
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className={compact ? 'max-h-80 overflow-y-auto space-y-1.5' : 'space-y-1.5'}>
        {items.map(n => (
          <div
            key={n.id}
            className={`text-xs border rounded-md p-2 ${n.read ? 'border-border bg-background' : 'border-primary/40 bg-primary/5'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{n.title}</p>
                <p className="text-muted-foreground break-words">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!n.read && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => markRead(n.id)} title="Marcar como lida">
                    <Check className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(n.id)} title="Excluir">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsBadge() {
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
      .channel(`notif-badge-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export { Bell };