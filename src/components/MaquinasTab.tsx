import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { UNIDADES, ARMAZENS, TIPOS_MAQUINA, FROTAS, MARCAS, MODELOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Wrench } from 'lucide-react';
import { toast } from 'sonner';

type Maquina = Tables<'maquinas'>;

export function MaquinasTab() {
  const { user, uploadImage } = useAuth();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | null>(null);
  const [detailMaquina, setDetailMaquina] = useState<Maquina | null>(null);

  const [tipo, setTipo] = useState('');
  const [frota, setFrota] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const fetchMaquinas = async () => {
    const { data } = await supabase.from('maquinas').select('*').order('created_at', { ascending: false });
    if (data) setMaquinas(data);
  };

  useEffect(() => { fetchMaquinas(); }, []);

  if (!user) return null;

  const canCreate = user.role !== 'tecnico';
  const canEdit = user.role !== 'tecnico';
  const canDeleteMaq = user.role === 'gerente' || user.role === 'coordenador' || user.role === 'supervisor';

  // Filter machines by role
  const visibleMaquinas = maquinas.filter(m => {
    if (user.role === 'gerente' || user.role === 'tecnico') return true;
    if (user.role === 'coordenador') return m.unidade === user.unidade;
    if (user.role === 'supervisor') return m.unidade === user.unidade && m.armazem === user.armazem;
    return false;
  });

  const resetForm = () => { setTipo(''); setFrota(''); setMarca(''); setModelo(''); setUnidade(''); setArmazem(''); setFotoPreview(undefined); setFotoFile(null); };

  const openCreate = () => {
    resetForm();
    if (user.role === 'coordenador') setUnidade(user.unidade || '');
    if (user.role === 'supervisor') { setUnidade(user.unidade || ''); setArmazem(user.armazem || ''); }
    setCreateOpen(true);
  };

  const openEdit = (m: Maquina) => {
    setTipo(m.tipo); setFrota(m.frota); setMarca(m.marca); setModelo(m.modelo);
    setUnidade(m.unidade); setArmazem(m.armazem); setFotoPreview(m.foto_url || undefined); setFotoFile(null);
    setEditMaquina(m);
  };

  const handleFotoChange = (base64: string | undefined, file?: File) => {
    setFotoPreview(base64);
    setFotoFile(file || null);
  };

  const checkDuplicate = () => {
    return maquinas.some(m =>
      m.tipo === tipo && m.frota === frota && m.marca === marca && m.modelo === modelo &&
      m.unidade === unidade && m.armazem === armazem &&
      (!editMaquina || m.id !== editMaquina.id)
    );
  };

  const handleSave = async () => {
    if (!tipo || !frota || !marca || !modelo || !unidade || !armazem) return;

    if (checkDuplicate()) {
      toast.error('Máquina já cadastrada com essas informações!');
      return;
    }

    let foto_url = editMaquina?.foto_url || null;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'maquinas');
      if (url) foto_url = url;
    } else if (!fotoPreview) {
      foto_url = null;
    }

    if (editMaquina) {
      await supabase.from('maquinas').update({ tipo, frota, marca, modelo, unidade, armazem, foto_url }).eq('id', editMaquina.id);
      setEditMaquina(null);
    } else {
      await supabase.from('maquinas').insert({ tipo, frota, marca, modelo, unidade, armazem, foto_url });
      setCreateOpen(false);
    }
    resetForm();
    fetchMaquinas();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('maquinas').delete().eq('id', id);
    setDetailMaquina(null);
    fetchMaquinas();
  };

  // Determine which fields user can select
  const showUnidadeSelect = user.role === 'gerente';
  const showArmazemSelect = user.role === 'gerente' || user.role === 'coordenador';

  const formContent = (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Tipo *</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{TIPOS_MAQUINA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Frota *</Label>
        <Select value={frota} onValueChange={setFrota}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{FROTAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Marca *</Label>
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Modelo *</Label>
        <Select value={modelo} onValueChange={setModelo}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{MODELOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {showUnidadeSelect && (
        <div>
          <Label>Unidade *</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {showArmazemSelect && (
        <div>
          <Label>Armazém *</Label>
          <Select value={armazem} onValueChange={setArmazem}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{ARMAZENS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Foto</Label>
        <ImageUpload value={fotoPreview} onChange={handleFotoChange} label="Foto da máquina" />
      </div>
      <Button onClick={handleSave} disabled={!tipo || !frota || !marca || !modelo || !unidade || !armazem}>Salvar</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Máquinas</h2>
        {canCreate && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nova Máquina
          </Button>
        )}
      </div>

      {visibleMaquinas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma máquina cadastrada</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMaquinas.map(m => (
            <Card key={m.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailMaquina(m)}>
              {m.foto_url ? (
                <img src={m.foto_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">{m.tipo} — {m.frota}</p>
                <p className="text-muted-foreground">{m.marca} {m.modelo}</p>
                <p className="text-xs text-muted-foreground">{m.unidade} / {m.armazem}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {canDeleteMaq && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Máquina</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMaquina} onOpenChange={() => { setEditMaquina(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Máquina</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailMaquina} onOpenChange={() => setDetailMaquina(null)}>
        <DialogContent>
          {detailMaquina && (
            <>
              <DialogHeader><DialogTitle>{detailMaquina.tipo} — {detailMaquina.frota}</DialogTitle></DialogHeader>
              {detailMaquina.foto_url && <img src={detailMaquina.foto_url} alt="" className="w-full rounded-lg object-contain max-h-64" />}
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Tipo:</span><span>{detailMaquina.tipo}</span>
                <span className="text-muted-foreground">Frota:</span><span>{detailMaquina.frota}</span>
                <span className="text-muted-foreground">Marca:</span><span>{detailMaquina.marca}</span>
                <span className="text-muted-foreground">Modelo:</span><span>{detailMaquina.modelo}</span>
                <span className="text-muted-foreground">Unidade:</span><span>{detailMaquina.unidade}</span>
                <span className="text-muted-foreground">Armazém:</span><span>{detailMaquina.armazem}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
