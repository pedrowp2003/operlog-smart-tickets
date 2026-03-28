import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTecnicos, deleteUser } from '@/data/store';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, User as UserIcon } from 'lucide-react';

export function TecnicosTab() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [detailTecnico, setDetailTecnico] = useState<User | null>(null);

  const tecnicos = useMemo(() => getTecnicos(), [refresh]);

  if (!user) return null;

  const canDelete = user.role === 'gerente';

  const handleDelete = (id: string) => {
    deleteUser(id);
    setDetailTecnico(null);
    setRefresh(r => r + 1);
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
              {t.foto ? (
                <img src={t.foto} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
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
                {detailTecnico.foto ? (
                  <img src={detailTecnico.foto} alt="" className="w-32 h-32 rounded-full object-cover" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-muted-foreground" />
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
