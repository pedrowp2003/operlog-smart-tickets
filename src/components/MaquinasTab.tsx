import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMaquinas, addMaquina, updateMaquina, deleteMaquina } from '@/data/store';
import { Maquina, UNIDADES, ARMAZENS, TIPOS_MAQUINA, FROTAS, MARCAS, MODELOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Wrench } from 'lucide-react';

export function MaquinasTab() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | null>(null);
  const [detailMaquina, setDetailMaquina] = useState<Maquina | null>(null);

  // Form state
  const [tipo, setTipo] = useState('');
  const [frota, setFrota] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [foto, setFoto] = useState<string | undefined>();

  const allMaquinas = useMemo(() => getMaquinas(), [refresh]);

  if (!user) return null;

  const canCreate = user.role !== 'tecnico';
  const canEdit = user.role !== 'tecnico';
  const canDeleteMaq = user.role === 'gerente' || user.role === 'coordenador' || user.role === 'supervisor';

  const resetForm = () => { setTipo(''); setFrota(''); setMarca(''); setModelo(''); setUnidade(''); setArmazem(''); setFoto(undefined); };

  const openCreate = () => {
    resetForm();
    if (user.role === 'coordenador') setUnidade(user.unidade || '');
    if (user.role === 'supervisor') { setUnidade(user.unidade || ''); setArmazem(user.armazem || ''); }
    setCreateOpen(true);
  };

  const openEdit = (m: Maquina) => {
    setTipo(m.tipo); setFrota(m.frota); setMarca(m.marca); setModelo(m.modelo);
    setUnidade(m.unidade); setArmazem(m.armazem); setFoto(m.foto);
    setEditMaquina(m);
  };

  const handleSave = () => {
    if (!tipo || !frota || !marca || !modelo || !unidade || !armazem) return;
    const maq: Maquina = {
      id: editMaquina?.id || crypto.randomUUID(),
      tipo, frota, marca, modelo, unidade, armazem, foto,
    };
    if (editMaquina) {
      updateMaquina(maq);
      setEditMaquina(null);
    } else {
      addMaquina(maq);
      setCreateOpen(false);
    }
    resetForm();
    setRefresh(r => r + 1);
  };

  const handleDelete = (id: string) => {
    deleteMaquina(id);
    setDetailMaquina(null);
    setRefresh(r => r + 1);
  };

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
      {user.role === 'gerente' && (
        <div>
          <Label>Unidade *</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {(user.role === 'gerente' || user.role === 'coordenador') && (
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
        <ImageUpload value={foto} onChange={setFoto} label="Foto da máquina" />
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

      {allMaquinas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma máquina cadastrada</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {allMaquinas.map(m => (
            <Card key={m.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailMaquina(m)}>
              {m.foto ? (
                <img src={m.foto} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
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

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Máquina</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editMaquina} onOpenChange={() => { setEditMaquina(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Máquina</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detailMaquina} onOpenChange={() => setDetailMaquina(null)}>
        <DialogContent>
          {detailMaquina && (
            <>
              <DialogHeader><DialogTitle>{detailMaquina.tipo} — {detailMaquina.frota}</DialogTitle></DialogHeader>
              {detailMaquina.foto && <img src={detailMaquina.foto} alt="" className="w-full h-48 object-cover rounded-lg" />}
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
