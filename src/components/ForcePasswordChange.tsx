import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword, PASSWORD_RULES_TEXT } from '@/lib/password';
import { toast } from 'sonner';

export function ForcePasswordChange() {
  const { user, updatePassword, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || !user.must_change_password) return null;

  const handleSave = async () => {
    setErr('');
    const vErr = validatePassword(pwd);
    if (vErr) { setErr(vErr); return; }
    if (pwd !== pwd2) { setErr('As senhas não coincidem'); return; }
    setSaving(true);
    const upErr = await updatePassword(pwd);
    if (upErr) {
      setSaving(false);
      const lower = upErr.toLowerCase();
      if (lower.includes('session') || lower.includes('sessão') || lower.includes('jwt') || lower.includes('missing')) {
        toast.error('Sua sessão expirou. Entre novamente com a senha Pipoca123# para definir a nova senha.');
        await logout();
        navigate('/login');
        return;
      }
      setErr(upErr);
      return;
    }
    await updateProfile({ must_change_password: false });
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    setSaving(false);
    toast.success('Senha definida com sucesso');
  };

  return (
    <Dialog open onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle>Defina sua senha</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Por segurança, defina uma nova senha para continuar.</p>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input type={show ? 'text' : 'password'} value={pwd} onChange={(e) => setPwd(e.target.value)} className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{PASSWORD_RULES_TEXT}</p>
          </div>
          <div>
            <Label>Confirmar Senha</Label>
            <Input type={show ? 'text' : 'password'} value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}