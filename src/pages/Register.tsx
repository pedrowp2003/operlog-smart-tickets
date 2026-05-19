import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ImageUpload';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { formatPhone } from '@/types';
import { validatePassword, PASSWORD_RULES_TEXT } from '@/lib/password';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/operlog-logo.png';

export default function Register() {
  const navigate = useNavigate();
  const { uploadImage } = useAuth();
  const [adminPassword, setAdminPassword] = useState('');
  const [adminOk, setAdminOk] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!adminPassword.trim()) { setError('Informe a senha de administrador'); return; }
    if (!username.trim() || !email.trim() || !nome.trim() || !sobrenome.trim() || !telefone.trim()) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    const pErr = validatePassword(password);
    if (pErr) { setError(pErr); return; }

    setLoading(true);
    let foto_url: string | undefined;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    }

    const { data, error: fnErr } = await supabase.functions.invoke('analyst-signup', {
      body: {
        admin_password: adminPassword,
        email: email.trim(),
        password,
        username: username.trim(),
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim(),
        foto_url,
      },
    });
    if (fnErr || (data && data.error)) {
      setError((data && data.error) || fnErr?.message || 'Erro ao cadastrar');
      setLoading(false);
      return;
    }
    if (!adminOk) setAdminOk(true);
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (loginErr) { navigate('/login'); return; }
    navigate('/dashboard');
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/analyst" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={200} height={200} className="mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cadastro de Analista</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Senha de Administrador *</Label>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Senha de administrador" />
            </div>
            <div>
              <Label>Nome de Usuário *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Senha *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{PASSWORD_RULES_TEXT}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div><Label>Sobrenome *</Label><Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} /></div>
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={formatPhone(telefone)} onChange={handleTelefoneChange} placeholder="(XX) XXXXX-XXXX" inputMode="numeric" />
            </div>
            <div>
              <Label>Foto (opcional)</Label>
              <ImageUpload value={fotoPreview} onChange={(b, f) => { setFotoPreview(b); setFotoFile(f || null); }} label="Sua foto" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar-se'}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}