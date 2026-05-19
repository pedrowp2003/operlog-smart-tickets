import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { UserRole, UNIDADES, ARMAZENS, AREAS, ROLE_LABELS, formatPhone } from '@/types';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { validatePassword, PASSWORD_RULE_MSG } from '@/lib/password';
import logo from '@/assets/operlog-logo.png';

const ADMIN_MASTER_PASSWORD = 'admin123@';

export default function Register() {
  const navigate = useNavigate();
  const { register, uploadImage } = useAuth();
  const [masterOk, setMasterOk] = useState(false);
  const [masterInput, setMasterInput] = useState('');
  const [masterError, setMasterError] = useState('');
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
  const [area, setArea] = useState('');
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
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (!nome.trim() || !sobrenome.trim()) {
      setError('Preencha nome e sobrenome');
      return;
    }
    if (role === 'tecnico' && !area) {
      setError('Selecione a área de atuação');
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
      area: area || undefined,
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
          <img src={logo} alt="OperLog" width={280} height={280} className="mx-auto mb-2" />
        </CardHeader>
        <CardContent>
          {!masterOk ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (masterInput === ADMIN_MASTER_PASSWORD) {
                  setMasterOk(true);
                  setMasterError('');
                } else {
                  setMasterError('Senha de administrador incorreta');
                }
              }}
            >
              <p className="text-sm text-muted-foreground">
                Apenas analistas podem cadastrar usuários. Informe a senha de administrador para continuar.
              </p>
              <div>
                <Label>Senha de administrador</Label>
                <Input
                  type="password"
                  value={masterInput}
                  onChange={(e) => setMasterInput(e.target.value)}
                  placeholder="Senha mestre"
                />
              </div>
              {masterError && <p className="text-sm text-destructive">{masterError}</p>}
              <Button type="submit" className="w-full">Continuar</Button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Tipo de Usuário *</Label>
              <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setUnidade(''); setArmazem(''); setArea(''); }}>
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

            {role && (
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

            {role === 'tecnico' && (
              <>
                <div>
                  <Label>Área de Atuação *</Label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
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
