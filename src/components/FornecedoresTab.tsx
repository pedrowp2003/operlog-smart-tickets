import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Package, Filter, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatPhone, NATUREZAS, NaturezaFornecedor } from '@/types';
import { toast } from 'sonner';

type Fornecedor = Tables<'fornecedores'>;

export function FornecedoresTab() {
  const { user, uploadImage } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFornecedor, setEditFornecedor] = useState<Fornecedor | null>(null);
  const [detailFornecedor, setDetailFornecedor] = useState<Fornecedor | null>(null);
  const [filterNatureza, setFilterNatureza] = useState<'todas' | NaturezaFornecedor>('todas');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [natureza, setNatureza] = useState<NaturezaFornecedor>('Tornearia');
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const fetchFornecedores = async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome');
    if (data) setFornecedores(data);
  };

  useEffect(() => { fetchFornecedores(); }, []);

  if (!user) return null;

  const canManage = user.role === 'analista';

  const fornecedoresFiltrados = fornecedores.filter(f => {
    if (filterNatureza !== 'todas' && (f as any).natureza !== filterNatureza) return false;
    if (search.trim() && !f.nome.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const resetForm = () => { setNome(''); setTelefone(''); setNatureza('Tornearia'); setFotoPreview(undefined); setFotoFile(null); };

  const openEdit = (f: Fornecedor) => {
    setNome(f.nome);
    setTelefone(f.telefone);
    setNatureza(((f as any).natureza as NaturezaFornecedor) || 'Tornearia');
    setFotoPreview(f.foto_url || undefined);
    setFotoFile(null);
    setEditFornecedor(f);
  };

  const handleFotoChange = (base64: string | undefined, file?: File) => {
    setFotoPreview(base64);
    setFotoFile(file || null);
  };

  const handleSave = async () => {
    if (!nome.trim() || !telefone.trim()) return;
    const dupe = fornecedores.some(f =>
      f.nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
      (!editFornecedor || f.id !== editFornecedor.id)
    );
    if (dupe) {
      toast.error('Fornecedor já cadastrado com esse nome');
      return;
    }
    let foto_url = editFornecedor?.foto_url || null;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'fornecedores');
      if (url) foto_url = url;
    } else if (!fotoPreview) {
      foto_url = null;
    }
    const payload = {
      nome: nome.trim(),
      telefone: telefone.replace(/\D/g, '').slice(0, 11),
      descricao: '',
      natureza,
      foto_url,
    } as any;
    if (editFornecedor) {
      await supabase.from('fornecedores').update(payload).eq('id', editFornecedor.id);
      setEditFornecedor(null);
    } else {
      await supabase.from('fornecedores').insert(payload);
      setCreateOpen(false);
    }
    resetForm();
    fetchFornecedores();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('fornecedores').delete().eq('id', id);
    setDetailFornecedor(null);
    fetchFornecedores();
  };

  const handleTelefone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Nome *</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do fornecedor" />
      </div>
      <div>
        <Label>Telefone *</Label>
        <Input value={formatPhone(telefone)} onChange={handleTelefone} placeholder="(XX) XXXXX-XXXX" inputMode="numeric" />
      </div>
      <div>
        <Label>Natureza da atividade *</Label>
        <Select value={natureza} onValueChange={(v) => setNatureza(v as NaturezaFornecedor)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {NATUREZAS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Logo</Label>
        <ImageUpload value={fotoPreview} onChange={handleFotoChange} label="Logo do fornecedor" />
      </div>
      <Button onClick={handleSave} disabled={!nome.trim() || !telefone.trim()}>Salvar</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Fornecedores</h2>
        <div className="flex gap-1 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Filtrar"><Filter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <Label className="text-xs">Natureza da atividade</Label>
              <Select value={filterNatureza} onValueChange={(v) => setFilterNatureza(v as any)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {NATUREZAS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Pesquisar"><Search className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar fornecedor..." className="h-8 text-xs" />
            </PopoverContent>
          </Popover>
          {canManage && (
            <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Novo Fornecedor</span>
            </Button>
          )}
        </div>
      </div>

      {fornecedoresFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum fornecedor cadastrado</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fornecedoresFiltrados.map(f => (
            <Card key={f.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailFornecedor(f)}>
              {f.foto_url ? (
                <img src={f.foto_url} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded object-contain bg-muted flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium break-words">{f.nome}</p>
                <p className="text-muted-foreground">{formatPhone(f.telefone)}</p>
                {(f as any).natureza && <p className="text-xs text-muted-foreground break-words">{(f as any).natureza}</p>}
              </div>
              {canManage && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(f); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFornecedor} onOpenChange={() => { setEditFornecedor(null); resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Fornecedor</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailFornecedor} onOpenChange={() => setDetailFornecedor(null)}>
        <DialogContent>
          {detailFornecedor && (
            <>
              <DialogHeader><DialogTitle className="break-words">{detailFornecedor.nome}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {detailFornecedor.foto_url ? (
                  <img src={detailFornecedor.foto_url} alt="" className="w-full max-h-72 rounded-lg object-contain bg-muted" />
                ) : (
                  <div className="w-40 h-40 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="text-sm space-y-1 w-full">
                  <p><span className="text-muted-foreground">Telefone:</span> {formatPhone(detailFornecedor.telefone)}</p>
                  {(detailFornecedor as any).natureza && (
                    <p><span className="text-muted-foreground">Natureza da atividade:</span> {(detailFornecedor as any).natureza}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
