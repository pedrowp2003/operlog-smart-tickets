import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    const success = login(username.trim(), password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={56} height={56} className="mx-auto mb-2" />
          <CardTitle className="text-xl text-primary">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome de usuário" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Não tem conta?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">Cadastrar-se</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
