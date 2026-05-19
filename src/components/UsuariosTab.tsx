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
import { Trash2, Pencil, User as UserIcon, Plus, Filter, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatPhone, ROLE_LABELS, UserRole, UNIDADES, ARMAZENS, AREAS } from '@/types';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmDialog';

function generateTempPassword(username: string, telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '0');
  return `${username.trim().toLowerCase()}${last4}`;
}

export function UsuariosTab() {
  const { user, uploadImage } = useAuth();
  const confirm = useConfirm();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [detail, setDetail] = useState<Profile | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<UserRole | 'todos'>('todos');
  const [filterTecArea, setFilterTecArea] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('nome_asc');

  // Form state
  const [role, setRole] = useState<UserRole | ''>('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [area, setArea] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [createdInfo, setCreatedInfo] = useState<{ username: string; password: string } | null>(null);

  const fetch = async () => {
    const { data } = await supabase.from('profiles').select('*').order('nome');
    if (data) setUsuarios(data);
  };
  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    const handler = async (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: string; id: string };
      if (!d || (d.kind !== 'usuario' && d.kind !== 'tecnico')) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', d.id).maybeSingle();
      if (data) setDetail(data as Profile);
    };
    window.addEventListener('app:focus', handler as EventListener);
    return () => window.removeEventListener('app:focus', handler as EventListener);
  }, []);

  if (!user) return null;

  const resetForm = () => {
    setRole(''); setUsername(''); setEmail('');
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
    const ok = await confirm({
      title: 'Excluir usuário?',
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
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
    if (!role || !username.trim() || !email.trim() || !telefone.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    if (user.role === 'analista' && role === 'analista') {
      toast.error('Analistas não podem cadastrar outras contas de analista');
      return;
    }
    const tempPassword = generateTempPassword(username, telefone);
    let foto_url: string | undefined;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    }
    const { data: result, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: email.trim(),
        password: tempPassword,
        metadata: {
          username: username.trim(),
          role,
          nome: nome.trim() || undefined,
          sobrenome: sobrenome.trim() || undefined,
          telefone: telefone.replace(/\D/g, '').slice(0, 11),
          foto_url,
          unidade: unidade || undefined,
          armazem: armazem || undefined,
          area: area || undefined,
          must_change_password: 'true',
        },
      },
    });
    if (fnErr || (result as any)?.error) {
      toast.error((result as any)?.error || fnErr?.message || 'Erro ao cadastrar usuário');
      return;
    }
    setCreatedInfo({ username: username.trim(), password: tempPassword });
    setCreateOpen(false);
    toast.success('Usuário cadastrado');
    resetForm();
    void fetch();
  };

  const roleEmoji = (r: string) => ROLE_LABELS[r as UserRole] || r;

  const usuariosFiltrados = usuarios.filter(u => {
    if (filterRole !== 'todos' && u.role !== filterRole) return false;
    if (filterRole === 'tecnico' && filterTecArea !== 'todas' && u.area !== filterTecArea) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const full = `${u.nome || ''} ${u.sobrenome || ''} ${u.username}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const na = (a.nome || a.username).toLowerCase();
    const nb = (b.nome || b.username).toLowerCase();
    switch (sortBy) {
      case 'recent': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'nome_desc': return nb.localeCompare(na);
      case 'nome_asc':
      default: return na.localeCompare(nb);
    }
  });

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
            {(Object.keys(ROLE_LABELS) as UserRole[])
              .filter(r => !(user?.role === 'analista' && r === 'analista'))
              .map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Usuário *</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">
        Uma senha temporária será gerada. O próprio usuário definirá a senha no primeiro acesso.
      </p>
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
        <div className="flex gap-1 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Filtrar" className="h-9 w-9 p-0"><Filter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-2">
              <div>
                <Label className="text-xs">Tipo de usuário</Label>
                <Select value={filterRole} onValueChange={(v) => setFilterRole(v as UserRole | 'todos')}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filterRole === 'tecnico' && (
                <div>
                  <Label className="text-xs">Área de atuação</Label>
                  <Select value={filterTecArea} onValueChange={setFilterTecArea}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Ordenar por</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome_asc">Nome (A→Z)</SelectItem>
                    <SelectItem value="nome_desc">Nome (Z→A)</SelectItem>
                    <SelectItem value="recent">Mais recente</SelectItem>
                    <SelectItem value="oldest">Menos recente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Usuário</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {usuariosFiltrados.map(u => (
          <Card key={u.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-center" onClick={() => setDetail(u)}>
            {u.foto_url ? (
              <img src={u.foto_url} alt="" width={56} height={56} loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
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
              {!(user.role === 'analista' && u.role === 'analista' && u.id !== user.id) && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {u.id !== user.id && !(user.role === 'analista' && u.role === 'analista') && (
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

      <Dialog open={!!createdInfo} onOpenChange={() => setCreatedInfo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Senha temporária gerada</DialogTitle></DialogHeader>
          {createdInfo && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Repasse estas credenciais para <b>@{createdInfo.username}</b>. No primeiro acesso o usuário definirá a própria senha.
              </p>
              <div className="rounded-md border border-border bg-muted p-3 text-sm font-mono break-all select-all">
                {createdInfo.password}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard?.writeText(createdInfo.password);
                  toast.success('Senha copiada');
                }}
              >
                Copiar senha
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}