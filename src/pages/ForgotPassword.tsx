import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    const trimmed = email.trim();
    if (!trimmed) { setError('Informe o e-mail'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { setError('E-mail inválido'); return; }
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetErr) { setError('Não foi possível enviar o e-mail. Tente novamente.'); return; }
    setMsg('Enviamos um e-mail com instruções para redefinir sua senha. Verifique sua caixa de entrada.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={200} height={200} className="mx-auto mb-2" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Informe seu e-mail. Enviaremos um link de recuperação de senha para ele.
            </p>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {msg && <p className="text-sm text-primary">{msg}</p>}
            <Button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar link de recuperação'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}