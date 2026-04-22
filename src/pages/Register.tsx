import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { UserRole, UNIDADES, ARMAZENS, ROLE_LABELS, formatPhone } from '@/types';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';
export default function Register() {
  const navigate = useNavigate();
  const { register, uploadImage } = useAuth();
  const [role, setRole] = useState<UserRole | ''>('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>();
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFotoChange = (base64: string | undefined, file?: File) => {
    setFotoPreview(base64);
    setFotoFile(file || null);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setTelefone(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!role || !username.trim() || !email.trim() || !password.trim() || !telefone.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 dígitos');
      return;
    }
    if (role === 'tecnico' && (!nome.trim() || !sobrenome.trim())) {
      setError('Preencha nome e sobrenome');
      return;
    }
    if (role === 'coordenador' && !unidade) {
      setError('Selecione a unidade');
      return;
    }
    if (role === 'supervisor' && !armazem) {
      setError('Selecione o armazém');
      return;
    }

    setLoading(true);

    let foto_url: string | undefined;
    if (fotoFile) {
      const url = await uploadImage(fotoFile, 'profiles');
      if (url) foto_url = url;
    }

    const metadata: Record<string, string | undefined> = {
      username: username.trim(),
      role,
      nome: nome.trim() || undefined,
      sobrenome: sobrenome.trim() || undefined,
      telefone: telefone.trim(),
      foto_url,
      unidade: unidade || undefined,
      armazem: armazem || undefined,
    };

    const err = await register(email.trim(), password, metadata);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={80} height={80} className="mx-auto mb-2" />
          <CardTitle className="text-xl text-primary">Cadastrar-se</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Tipo de Usuário *</Label>
              <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setUnidade(''); setArmazem(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome de Usuário *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome de usuário" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 dígitos" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {role === 'tecnico' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <Label>Sobrenome *</Label>
                  <Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} placeholder="Sobrenome" />
                </div>
              </div>
            )}

            {role === 'coordenador' && (
              <div>
                <Label>Unidade *</Label>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === 'supervisor' && (
              <div>
                <Label>Armazém *</Label>
                <Select value={armazem} onValueChange={setArmazem}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ARMAZENS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Telefone *</Label>
              <Input
                value={formatPhone(telefone)}
                onChange={handleTelefoneChange}
                placeholder="(XX) XXXXX-XXXX"
                inputMode="numeric"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar-se'}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
