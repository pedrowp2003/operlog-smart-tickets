import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Package } from 'lucide-react';
import { formatPhone } from '@/types';
import { toast } from 'sonner';

type Fornecedor = Tables<'fornecedores'>;

const MAX_DESC = 300;

export function FornecedoresTab() {
  const { user, uploadImage } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFornecedor, setEditFornecedor] = useState<Fornecedor | null>(null);
  const [detailFornecedor, setDetailFornecedor] = useState<Fornecedor | null>(null);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const fetchFornecedores = async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome');
    if (data) setFornecedores(data);
  };

  useEffect(() => { fetchFornecedores(); }, []);

  if (!user) return null;

  const canManage = user.role === 'analista';

  const resetForm = () => { setNome(''); setTelefone(''); setDescricao(''); setFotoPreview(undefined); setFotoFile(null); };

  const openEdit = (f: Fornecedor) => {
    setNome(f.nome);
    setTelefone(f.telefone);
    setDescricao(f.descricao);
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
      descricao: descricao.trim().toUpperCase().slice(0, MAX_DESC),
      foto_url,
    };
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
        <Label>Descrição ({descricao.length}/{MAX_DESC})</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value.toUpperCase().slice(0, MAX_DESC))}
          rows={3}
          maxLength={MAX_DESC}
          style={{ textTransform: 'uppercase' }}
          placeholder="DESCRIÇÃO DO FORNECEDOR..."
        />
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
        {canManage && (
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo Fornecedor
          </Button>
        )}
      </div>

      {fornecedores.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum fornecedor cadastrado</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fornecedores.map(f => (
            <Card key={f.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailFornecedor(f)}>
              {f.foto_url ? (
                <img src={f.foto_url} alt="" className="w-16 h-16 rounded object-contain bg-muted flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium break-words">{f.nome}</p>
                <p className="text-muted-foreground">{formatPhone(f.telefone)}</p>
                {f.descricao && <p className="text-xs text-muted-foreground break-words line-clamp-2">{f.descricao}</p>}
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
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFornecedor} onOpenChange={() => { setEditFornecedor(null); resetForm(); }}>
        <DialogContent>
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
                  {detailFornecedor.descricao && (
                    <div>
                      <p className="text-muted-foreground">Descrição:</p>
                      <p className="break-words whitespace-pre-wrap">{detailFornecedor.descricao}</p>
                    </div>
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
