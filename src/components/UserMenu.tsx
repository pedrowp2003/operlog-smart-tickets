import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, UserRole, UNIDADES, ARMAZENS, formatPhone } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { User, LogOut, Trash2, Settings, Eye, EyeOff } from 'lucide-react';

export function UserMenu() {
  const { user, logout, updateProfile, updateEmail, updatePassword, deleteAccount, uploadImage } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const isTecnico = user.role === 'tecnico';
  const isCoordenador = user.role === 'coordenador';
  const isSupervisor = user.role === 'supervisor';
  const isAnalista = user.role === 'analista';

  const openEdit = () => {
    setUsername(user.username);
    setEmail(user.email);
    setTelefone(user.telefone);
    setNome(user.nome || '');
    setSobrenome(user.sobrenome || '');
    setUnidade(user.unidade || '');
    setArmazem(user.armazem || '');
    setNewPassword('');
    setPasswordError('');
    setFotoPreview(user.foto_url || undefined);
    setFotoFile(null);
    setEditOpen(true);
  };

  const handleFotoChange = (base64: string | undefined, file?: File) => {
    setFotoPreview(base64);
    setFotoFile(file || null);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setTelefone(digits);
  };

  const handleSave = async () => {
    setPasswordError('');
    if (newPassword) {
      const { validatePassword } = await import('@/lib/password');
      const v = validatePassword(newPassword);
      if (v) { setPasswordError(v); return; }
    }

    setSaving(true);

    // Upload new photo if changed
    let foto_url = user.foto_url;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    } else if (!fotoPreview) {
      foto_url = null;
    }

    const updates: Record<string, unknown> = {
      username: username.trim(),
      telefone: telefone.trim(),
      foto_url,
    };

    updates.nome = nome.trim();
    updates.sobrenome = sobrenome.trim();
    if (isCoordenador || isSupervisor) {
      updates.unidade = unidade;
    }
    if (isSupervisor) {
      updates.armazem = armazem;
    }

    await updateProfile(updates);

    if (email.trim() !== user.email) {
      await updateEmail(email.trim());
    }

    if (newPassword) {
      const err = await updatePassword(newPassword);
      if (err) {
        setPasswordError(err);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteAccount();
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            {user.foto_url ? (
              <img src={user.foto_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">{user.username}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role as UserRole]}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openEdit}>
            <Settings className="w-4 h-4 mr-2" /> Editar informações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </DropdownMenuItem>
          {isAnalista && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir conta
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Informações</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            {isAnalista && <div>
              <Label>Nome de Usuário</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>}
            {isAnalista && <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>}
            {isAnalista && <div>
              <Label>Telefone</Label>
              <Input
                value={formatPhone(telefone)}
                onChange={handleTelefoneChange}
                placeholder="(XX) XXXXX-XXXX"
                inputMode="numeric"
              />
            </div>}

            {isAnalista && <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} />
              </div>
            </div>}
            {isAnalista && <div>
              <Label>Foto (opcional)</Label>
              <ImageUpload value={fotoPreview} onChange={handleFotoChange} label="Sua foto" />
            </div>}

            {isAnalista && (isCoordenador || isSupervisor) && (
              <div>
                <Label>Unidade</Label>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAnalista && isSupervisor && (
              <div>
                <Label>Armazém</Label>
                <Select value={armazem} onValueChange={setArmazem}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ARMAZENS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 dígitos"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="text-sm text-destructive mt-1">{passwordError}</p>}
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Conta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
