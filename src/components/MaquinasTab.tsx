import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { TIPOS_MAQUINA, FROTAS, MARCAS, MODELOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Wrench, Settings, X } from 'lucide-react';
import { toast } from 'sonner';

type Maquina = Tables<'maquinas'>;
type Unidade = Tables<'unidades'>;
type Armazem = Tables<'armazens'>;

export function MaquinasTab() {
  const { user, uploadImage } = useAuth();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [unidadesList, setUnidadesList] = useState<Unidade[]>([]);
  const [armazensList, setArmazensList] = useState<Armazem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | null>(null);
  const [detailMaquina, setDetailMaquina] = useState<Maquina | null>(null);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [novoArmazem, setNovoArmazem] = useState('');

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

  const fetchCategorias = async () => {
    const [u, a] = await Promise.all([
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('armazens').select('*').order('nome'),
    ]);
    if (u.data) setUnidadesList(u.data);
    if (a.data) setArmazensList(a.data);
  };

  useEffect(() => { fetchMaquinas(); fetchCategorias(); }, []);

  if (!user) return null;

  const canCreate = user.role === 'analista';
  const canEdit = user.role === 'analista';
  const canDeleteMaq = user.role === 'analista';
  const canManageCategorias = user.role === 'analista';

  const UNIDADES_NAMES = unidadesList.map(u => u.nome);
  const ARMAZENS_NAMES = armazensList.map(a => a.nome);

  // Filter machines by role
  const visibleMaquinas = maquinas.filter(m => {
    if (user.role === 'gerente' || user.role === 'tecnico' || user.role === 'analista') return true;
    if (user.role === 'coordenador') return m.unidade === user.unidade;
    if (user.role === 'supervisor') return m.armazem === user.armazem;
    return false;
  });

  const resetForm = () => { setTipo(''); setFrota(''); setMarca(''); setModelo(''); setUnidade(''); setArmazem(''); setFotoPreview(undefined); setFotoFile(null); };

  const openCreate = () => {
    resetForm();
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
    if (!tipo || !frota || !marca || !modelo || (!unidade && !armazem)) return;

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

  const showLocalSelect = true;
  const localValue = unidade ? `u:${unidade}` : armazem ? `a:${armazem}` : '';
  const handleLocalChange = (val: string) => {
    if (val.startsWith('u:')) { setUnidade(val.slice(2)); setArmazem(''); }
    else if (val.startsWith('a:')) { setArmazem(val.slice(2)); setUnidade(''); }
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
      <div>
        <Label>Unidade / Armazém *</Label>
        {showLocalSelect ? (
          <Select value={localValue} onValueChange={handleLocalChange}>
            <SelectTrigger><SelectValue placeholder="Selecione unidade ou armazém" /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Unidades</SelectLabel>
                {UNIDADES_NAMES.map(u => <SelectItem key={`u-${u}`} value={`u:${u}`}>{u}</SelectItem>)}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Armazéns</SelectLabel>
                {ARMAZENS_NAMES.map(a => <SelectItem key={`a-${a}`} value={`a:${a}`}>{a}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center px-3 h-10 rounded-md border border-input bg-muted text-sm text-muted-foreground">
            {unidade || armazem || '—'}
          </div>
        )}
      </div>
      <div>
        <Label>Foto</Label>
        <ImageUpload value={fotoPreview} onChange={handleFotoChange} label="Foto da máquina" />
      </div>
      <Button onClick={handleSave} disabled={!tipo || !frota || !marca || !modelo || (!unidade && !armazem)}>Salvar</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Máquinas</h2>
        <div className="flex gap-2">
          {canManageCategorias && (
            <Button variant="outline" size="sm" onClick={() => setCategoriasOpen(true)} aria-label="Alterar categorias" title="Alterar categorias">
              <Settings className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Alterar categorias</span>
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Nova Máquina
            </Button>
          )}
        </div>
      </div>

      {visibleMaquinas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma máquina cadastrada</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMaquinas.map(m => (
            <Card key={m.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailMaquina(m)}>
              {m.foto_url ? (
                <img src={m.foto_url} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">{m.tipo} — {m.frota}</p>
                <p className="text-muted-foreground">{m.marca} {m.modelo}</p>
                <p className="text-xs text-muted-foreground">{m.unidade || m.armazem}</p>
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
                <span className="text-muted-foreground">Unidade/Armazém:</span><span>{detailMaquina.unidade || detailMaquina.armazem}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Alterar categorias dialog */}
      <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Alterar categorias</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">Unidades</h3>
              <div className="flex gap-2 mb-2">
                <Input value={novaUnidade} onChange={e => setNovaUnidade(e.target.value)} placeholder="Nova unidade" />
                <Button size="sm" onClick={async () => {
                  if (!novaUnidade.trim()) return;
                  const { error } = await supabase.from('unidades').insert({ nome: novaUnidade.trim() });
                  if (error) toast.error(error.message); else { setNovaUnidade(''); fetchCategorias(); }
                }}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {unidadesList.map(u => (
                  <CategoriaItem key={u.id} initial={u.nome} onRename={async (nome) => {
                    await supabase.from('unidades').update({ nome }).eq('id', u.id);
                    fetchCategorias();
                  }} onDelete={async () => {
                    await supabase.from('unidades').delete().eq('id', u.id);
                    fetchCategorias();
                  }} />
                ))}
              </div>
            </section>
            <section>
              <h3 className="font-semibold mb-2">Armazéns</h3>
              <div className="flex gap-2 mb-2">
                <Input value={novoArmazem} onChange={e => setNovoArmazem(e.target.value)} placeholder="Novo armazém" />
                <Button size="sm" onClick={async () => {
                  if (!novoArmazem.trim()) return;
                  const { error } = await supabase.from('armazens').insert({ nome: novoArmazem.trim() });
                  if (error) toast.error(error.message); else { setNovoArmazem(''); fetchCategorias(); }
                }}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1">
                {armazensList.map(a => (
                  <CategoriaItem key={a.id} initial={a.nome} onRename={async (nome) => {
                    await supabase.from('armazens').update({ nome }).eq('id', a.id);
                    fetchCategorias();
                  }} onDelete={async () => {
                    await supabase.from('armazens').delete().eq('id', a.id);
                    fetchCategorias();
                  }} />
                ))}
              </div>
            </section>
            <p className="text-xs text-muted-foreground">Tipos, frotas e modelos serão editáveis em breve.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriaItem({ initial, onRename, onDelete }: { initial: string; onRename: (nome: string) => Promise<void>; onDelete: () => Promise<void> }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex gap-2 items-center">
      <Input value={val} onChange={e => setVal(e.target.value)} className="h-8" />
      <Button size="sm" variant="outline" disabled={val === initial || !val.trim()} onClick={() => onRename(val.trim())}>
        <Pencil className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
