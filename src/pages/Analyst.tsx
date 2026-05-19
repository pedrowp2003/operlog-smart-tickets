import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';

export default function Analyst() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2 self-start">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <img src={logo} alt="OperLog" width={200} height={200} className="mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-primary">Área do Analista</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button size="lg" className="w-full h-12 text-base" onClick={() => navigate('/login')}>Entrar</Button>
          <Button size="lg" variant="outline" className="w-full h-12 text-base" onClick={() => navigate('/register')}>
            Cadastrar-se
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}