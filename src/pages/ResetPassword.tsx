import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';
import { validatePassword } from '@/lib/password';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    const v = validatePassword(password);
    if (v) { setError(v); return; }
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError('Não foi possível atualizar a senha. Solicite o link novamente.'); return; }
    setMsg('Senha atualizada com sucesso. Redirecionando...');
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <img src={logo} alt="OperLog" width={200} height={200} className="mx-auto mb-2" />
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">Validando link...</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Defina sua nova senha.</p>
              <div>
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 dígitos" className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {msg && <p className="text-sm text-primary">{msg}</p>}
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar nova senha'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}