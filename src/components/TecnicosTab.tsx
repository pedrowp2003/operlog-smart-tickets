import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, User as UserIcon } from 'lucide-react';
import { formatPhone } from '@/types';

export function TecnicosTab() {
  const { user } = useAuth();
  const [tecnicos, setTecnicos] = useState<Profile[]>([]);
  const [detailTecnico, setDetailTecnico] = useState<Profile | null>(null);

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'tecnico');
    if (data) setTecnicos(data);
  };

  useEffect(() => { fetchTecnicos(); }, []);

  if (!user) return null;

  const canDelete = user.role === 'gerente';

  const handleDelete = async (id: string) => {
    await supabase.from('profiles').delete().eq('id', id);
    setDetailTecnico(null);
    fetchTecnicos();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Técnicos de Manutenção</h2>

      {tecnicos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum técnico cadastrado</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tecnicos.map(t => (
            <Card key={t.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-center" onClick={() => setDetailTecnico(t)}>
              {t.foto_url ? (
                <img src={t.foto_url} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">{t.nome} {t.sobrenome}</p>
                <p className="text-muted-foreground">@{t.username}</p>
                <p className="text-xs text-muted-foreground">{t.telefone}</p>
              </div>
              {canDelete && (
                <Button variant="ghost" size="sm" className="text-destructive flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detailTecnico} onOpenChange={() => setDetailTecnico(null)}>
        <DialogContent>
          {detailTecnico && (
            <>
              <DialogHeader><DialogTitle>{detailTecnico.nome} {detailTecnico.sobrenome}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {detailTecnico.foto_url ? (
                  <img src={detailTecnico.foto_url} alt="" className="w-40 h-40 rounded-full object-contain bg-muted" />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="text-sm space-y-1 text-center">
                  <p className="font-medium text-lg">{detailTecnico.nome} {detailTecnico.sobrenome}</p>
                  <p className="text-muted-foreground">@{detailTecnico.username}</p>
                  <p className="text-muted-foreground">{detailTecnico.telefone}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
