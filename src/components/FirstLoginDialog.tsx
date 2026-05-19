import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { validatePassword } from '@/lib/password';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function FirstLoginDialog() {
  const { user, updatePassword, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.must_change_password) setOpen(true);
    else setOpen(false);
  }, [user?.must_change_password]);

  if (!user) return null;

  const handleSave = async () => {
    setError('');
    const v = validatePassword(pw);
    if (v) { setError(v); return; }
    if (pw !== pw2) { setError('As senhas não coincidem'); return; }
    setSaving(true);
    const err = await updatePassword(pw);
    if (err) { setError(err); setSaving(false); return; }
    await updateProfile({ must_change_password: false } as any);
    setSaving(false);
    toast.success('Senha definida com sucesso');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* não permite fechar */ }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Defina sua senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Este é seu primeiro acesso. Crie uma senha pessoal para continuar.
          </p>
          <div>
            <Label>Nova senha</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirme a nova senha</Label>
            <Input
              type={show ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar senha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}