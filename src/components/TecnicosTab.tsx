import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, User as UserIcon, Filter, Search } from 'lucide-react';
import { formatPhone, AREAS } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TecnicosTab() {
  const { user } = useAuth();
  const [tecnicos, setTecnicos] = useState<Profile[]>([]);
  const [detailTecnico, setDetailTecnico] = useState<Profile | null>(null);
  const [filterArea, setFilterArea] = useState<string>('todas');
  const [search, setSearch] = useState('');

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'tecnico');
    if (data) setTecnicos(data);
  };

  useEffect(() => { fetchTecnicos(); }, []);

  if (!user) return null;

  const canDelete = false;

  const tecnicosFiltrados = tecnicos.filter(t => {
    if (filterArea !== 'todas' && t.area !== filterArea) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const full = `${t.nome || ''} ${t.sobrenome || ''} ${t.username}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    await supabase.from('profiles').delete().eq('id', id);
    setDetailTecnico(null);
    fetchTecnicos();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">Técnicos de Manutenção</h2>
        <div className="flex gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Filtrar" className="h-9 w-9 p-0"><Filter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <Label className="text-xs">Área de atuação</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {tecnicosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum técnico cadastrado</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tecnicosFiltrados.map(t => (
            <Card key={t.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-center" onClick={() => setDetailTecnico(t)}>
              {t.foto_url ? (
                <img src={t.foto_url} alt="" width={56} height={56} loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">{t.nome} {t.sobrenome}</p>
                <p className="text-muted-foreground">@{t.username}</p>
                <p className="text-xs text-muted-foreground">{formatPhone(t.telefone)}</p>
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
              <DialogHeader><DialogTitle className="sr-only">{detailTecnico.nome} {detailTecnico.sobrenome}</DialogTitle></DialogHeader>
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
                  <p className="text-muted-foreground">{formatPhone(detailTecnico.telefone)}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
