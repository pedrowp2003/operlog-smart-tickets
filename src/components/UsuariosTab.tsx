import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Pencil, User as UserIcon, Plus } from 'lucide-react';
import { formatPhone, ROLE_LABELS, UserRole, UNIDADES, ARMAZENS, AREAS } from '@/types';
import { toast } from 'sonner';

export function UsuariosTab() {
  const { user, register, uploadImage } = useAuth();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [detail, setDetail] = useState<Profile | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<UserRole | 'todos'>('todos');

  // Form state
  const [role, setRole] = useState<UserRole | ''>('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [area, setArea] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();

  const fetch = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nome');
    if (data) setUsuarios(data);
  };
  useEffect(() => { fetch(); }, []);

  if (!user) return null;

  const resetForm = () => {
    setRole(''); setUsername(''); setEmail(''); setPassword('');
    setNome(''); setSobrenome(''); setTelefone('');
    setUnidade(''); setArmazem(''); setArea('');
    setFotoFile(null); setFotoPreview(undefined);
  };

  const openEdit = (u: Profile) => {
    if (user?.role === 'analista' && u.role === 'analista' && u.id !== user.id) {
      toast.error('Analistas não podem editar outras contas de analista');
      return;
    }
    setRole(u.role as UserRole);
    setUsername(u.username);
    setEmail(u.email);
    setNome(u.nome || '');
    setSobrenome(u.sobrenome || '');
    setTelefone(u.telefone || '');
    setUnidade(u.unidade || '');
    setArmazem(u.armazem || '');
    setArea(u.area || '');
    setFotoPreview(u.foto_url || undefined);
    setFotoFile(null);
    setEditUser(u);
  };

  const handleDelete = async (id: string) => {
    if (id === user.id) { toast.error('Você não pode excluir seu próprio usuário'); return; }
    const target = usuarios.find(u => u.id === id);
    if (user.role === 'analista' && target?.role === 'analista') {
      toast.error('Analistas não podem excluir outras contas de analista');
      return;
    }
    await supabase.from('profiles').delete().eq('id', id);
    setDetail(null);
    fetch();
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    let foto_url = editUser.foto_url;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    } else if (!fotoPreview) {
      foto_url = null;
    }
    await supabase.from('profiles').update({
      username: username.trim(),
      nome: nome.trim() || null,
      sobrenome: sobrenome.trim() || null,
      telefone: telefone.replace(/\D/g, '').slice(0, 11),
      unidade: unidade || null,
      armazem: armazem || null,
      area: area || null,
      foto_url,
    }).eq('id', editUser.id);
    setEditUser(null);
    resetForm();
    fetch();
  };

  const handleCreate = async () => {
    if (!role || !username.trim() || !email.trim() || !password.trim() || !telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    if (user.role === 'analista' && role === 'analista') {
      toast.error('Analistas não podem cadastrar outras contas de analista');
      return;
    }
    if (password.length < 8) { toast.error('Senha mínima de 8 dígitos'); return; }
    let foto_url: string | undefined;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    }
    const err = await register(email.trim(), password, {
      username: username.trim(),
      role,
      nome: nome.trim() || undefined,
      sobrenome: sobrenome.trim() || undefined,
      telefone: telefone.replace(/\D/g, '').slice(0, 11),
      foto_url,
      unidade: unidade || undefined,
      armazem: armazem || undefined,
      area: area || undefined,
    });
    if (err) { toast.error(err); return; }
    toast.success('Usuário cadastrado');
    setCreateOpen(false);
    resetForm();
    fetch();
  };

  const roleEmoji = (r: string) => ROLE_LABELS[r as UserRole] || r;

  const usuariosFiltrados = filterRole === 'todos' ? usuarios : usuarios.filter(u => u.role === filterRole);

  const editForm = (
    <div className="flex flex-col gap-3">
      <div><Label>Nome de usuário</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
        <div><Label>Sobrenome</Label><Input value={sobrenome} onChange={e => setSobrenome(e.target.value)} /></div>
      </div>
      <div>
        <Label>Telefone</Label>
        <Input value={formatPhone(telefone)} onChange={e => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder="(XX) XXXXX-XXXX" />
      </div>
      {role === 'coordenador' && (
        <div><Label>Unidade</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {role === 'supervisor' && (
        <div><Label>Armazém</Label>
          <Select value={armazem} onValueChange={setArmazem}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{ARMAZENS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {role === 'tecnico' && (
        <div><Label>Área de Atuação</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Foto</Label><ImageUpload value={fotoPreview} onChange={(b, f) => { setFotoPreview(b); setFotoFile(f || null); }} label="Foto do usuário" /></div>
      <Button onClick={handleEditSave}>Salvar</Button>
    </div>
  );

  const createForm = (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Tipo *</Label>
        <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setUnidade(''); setArmazem(''); setArea(''); }}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Usuário *</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><Label>Senha *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 dígitos" /></div>
      {(role === 'gerente' || role === 'coordenador' || role === 'supervisor' || role === 'tecnico') && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><Label>Sobrenome</Label><Input value={sobrenome} onChange={e => setSobrenome(e.target.value)} /></div>
        </div>
      )}
      <div>
        <Label>Telefone *</Label>
        <Input value={formatPhone(telefone)} onChange={e => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder="(XX) XXXXX-XXXX" />
      </div>
      {role === 'coordenador' && (
        <div><Label>Unidade *</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {role === 'supervisor' && (
        <div><Label>Armazém *</Label>
          <Select value={armazem} onValueChange={setArmazem}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{ARMAZENS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {role === 'tecnico' && (
        <div><Label>Área de Atuação *</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Foto</Label><ImageUpload value={fotoPreview} onChange={(b, f) => { setFotoPreview(b); setFotoFile(f || null); }} label="Foto" /></div>
      <Button onClick={handleCreate}>Cadastrar</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Usuários</h2>
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo Usuário
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Filtrar por tipo:</Label>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as UserRole | 'todos')}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {usuariosFiltrados.map(u => (
          <Card key={u.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-center" onClick={() => setDetail(u)}>
            {u.foto_url ? (
              <img src={u.foto_url} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-medium break-words">{u.nome ? `${u.nome} ${u.sobrenome || ''}` : u.username}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              <p className="text-xs text-primary">{roleEmoji(u.role)}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              {u.id !== user.id && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          {createForm}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={() => { setEditUser(null); resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editForm}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader><DialogTitle className="sr-only">{detail.nome} {detail.sobrenome}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {detail.foto_url ? (
                  <img src={detail.foto_url} alt="" className="w-40 h-40 rounded-full object-contain bg-muted" />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="text-sm space-y-1 text-center">
                  <p className="font-medium text-lg">{detail.nome} {detail.sobrenome}</p>
                  <p className="text-muted-foreground">@{detail.username}</p>
                  <p className="text-primary">{ROLE_LABELS[detail.role as UserRole]}</p>
                  <p className="text-muted-foreground">{detail.email}</p>
                  <p className="text-muted-foreground">{formatPhone(detail.telefone)}</p>
                  {detail.unidade && <p className="text-muted-foreground">Unidade: {detail.unidade}</p>}
                  {detail.armazem && <p className="text-muted-foreground">Armazém: {detail.armazem}</p>}
                  {detail.area && <p className="text-muted-foreground">Área: {detail.area}</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}