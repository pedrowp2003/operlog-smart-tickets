import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logo from '@/assets/operlog-logo.png';


export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="animate-fade-in flex flex-col items-center max-w-2xl w-full">
          <img src={logo} alt="OperLog" width={200} height={200} className="mb-8" />
          <h1 className="text-7xl font-extrabold text-primary tracking-tight mb-2">OperLog</h1>
          <p className="text-muted-foreground text-center mb-16 text-base">
            Gestão de chamados para manutenção
          </p>


          <div className="flex flex-col gap-6 w-full max-w-lg">
            <Button size="lg" className="w-full text-xl font-semibold h-14" onClick={() => navigate('/login')}>
              Entrar
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
