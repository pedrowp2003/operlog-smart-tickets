import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { ChamadosTab } from '@/components/ChamadosTab';
import { MaquinasTab } from '@/components/MaquinasTab';
import { TecnicosTab } from '@/components/TecnicosTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Wrench, Users } from 'lucide-react';
import logo from '@/assets/operlog-logo.png';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="OperLog" width={28} height={28} />
            <span className="font-bold text-primary text-lg">OperLog</span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        <Tabs defaultValue="chamados" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="chamados" className="gap-1.5">
              <ClipboardList className="w-4 h-4" /> Chamados
            </TabsTrigger>
            <TabsTrigger value="maquinas" className="gap-1.5">
              <Wrench className="w-4 h-4" /> Máquinas
            </TabsTrigger>
            <TabsTrigger value="tecnicos" className="gap-1.5">
              <Users className="w-4 h-4" /> Técnicos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chamados"><ChamadosTab /></TabsContent>
          <TabsContent value="maquinas"><MaquinasTab /></TabsContent>
          <TabsContent value="tecnicos"><TecnicosTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
