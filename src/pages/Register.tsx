import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { UserRole, UNIDADES, ARMAZENS, ROLE_LABELS } from '@/types';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole | ''>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [foto, setFoto] = useState<string | undefined>();
  const [unidade, setUnidade] = useState('');
  const [armazem, setArmazem] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!role || !username.trim() || !password.trim() || !telefone.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    if (role === 'tecnico' && (!nome.trim() || !sobrenome.trim())) {
      setError('Preencha nome e sobrenome');
      return;
    }
    if ((role === 'coordenador' || role === 'supervisor') && !unidade) {
      setError('Selecione a unidade');
      return;
    }
    if (role === 'supervisor' && !armazem) {
      setError('Selecione o armazém');
      return;
    }

    const success = register({
      id: crypto.randomUUID(),
      username: username.trim(),
      password,
      role,
      nome: nome.trim() || undefined,
      sobrenome: sobrenome.trim() || undefined,
      telefone: telefone.trim(),
      foto,
      unidade: unidade || undefined,
      armazem: armazem || undefined,
    });

    if (success) {
      navigate('/dashboard');
    } else {
      setError('Nome de usuário já existe');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={56} height={56} className="mx-auto mb-2" />
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
              <Label>Usuário *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome de usuário" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
            </div>

            {role === 'tecnico' && (
              <>
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
                <div>
                  <Label>Foto</Label>
                  <ImageUpload value={foto} onChange={setFoto} label="Sua foto" />
                </div>
              </>
            )}

            {(role === 'coordenador' || role === 'supervisor') && (
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
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Cadastrar-se</Button>
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
