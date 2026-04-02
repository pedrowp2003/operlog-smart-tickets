import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logo from '@/assets/operlog-logo.png';
import { Wrench, ClipboardList, Users } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="animate-fade-in flex flex-col items-center max-w-md w-full">
          <img src={logo} alt="OperLog" width={100} height={100} className="mb-4" />
          <h1 className="text-4xl font-extrabold text-primary tracking-tight mb-1">OperLog</h1>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            Gestão de chamados para manutenção
          </p>


          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button size="lg" className="w-full text-base font-semibold" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button size="lg" variant="outline" className="w-full text-base font-semibold" onClick={() => navigate('/register')}>
              Cadastrar-se
            </Button>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground py-4">
        © {new Date().getFullYear()} OperLog
      </footer>
    </div>
  );
}
