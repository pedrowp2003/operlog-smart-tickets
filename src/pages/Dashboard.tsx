import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { ChamadosTab } from '@/components/ChamadosTab';
import { MaquinasTab } from '@/components/MaquinasTab';
import { TecnicosTab } from '@/components/TecnicosTab';
import { UsuariosTab } from '@/components/UsuariosTab';
import { FornecedoresTab } from '@/components/FornecedoresTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Wrench, Users, Package, Bell, Medal, Hammer, ClipboardCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS, UserRole } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  const isAnalista = user.role === 'analista';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="OperLog" width={28} height={28} />
            <span className="font-bold text-primary text-base sm:text-lg truncate">OperLog</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Chat interno">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <p className="text-sm font-medium mb-1">Chat interno</p>
                <p className="text-xs text-muted-foreground">Em breve você poderá conversar com sua equipe aqui.</p>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative lg:hidden">
                  <Bell className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <p className="text-sm font-medium mb-1">Notificações</p>
                <p className="text-xs text-muted-foreground">Em breve você receberá notificações aqui.</p>
              </PopoverContent>
            </Popover>
            <div className="mr-1 flex shrink-0 items-center gap-1 whitespace-nowrap">
              {user.role === 'gerente' && (
                <Medal className="h-4 w-4 shrink-0" style={{ color: '#D4AF37' }} aria-label="Gerente" />
              )}
              {user.role === 'coordenador' && (
                <Medal className="h-4 w-4 shrink-0" style={{ color: '#C0C0C0' }} aria-label="Coordenador" />
              )}
              {user.role === 'supervisor' && (
                <Medal className="h-4 w-4 shrink-0" style={{ color: '#CD7F32' }} aria-label="Supervisor" />
              )}
              {user.role === 'tecnico' && (
                <Hammer className="h-4 w-4 shrink-0 text-primary" aria-label="Técnico" />
              )}
              {user.role === 'analista' && (
                <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Analista" />
              )}
              <span className="shrink-0 text-[11px] leading-tight text-muted-foreground sm:text-xs">
                {user.role === 'tecnico' ? 'Técnico' : user.role === 'analista' ? 'Analista' : ROLE_LABELS[user.role as UserRole]}
              </span>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Desktop side panels */}
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-60 border-r border-border bg-card flex-col p-4 gap-2 z-40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="w-4 h-4" /> Chat interno
        </div>
        <p className="text-xs text-muted-foreground">Em breve novas funções aparecerão aqui.</p>
      </aside>
      <aside className="hidden lg:flex fixed right-0 top-14 bottom-0 w-60 border-l border-border bg-card flex-col p-4 gap-2 z-40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="w-4 h-4" /> Notificações
        </div>
        <p className="text-xs text-muted-foreground">Em breve você receberá notificações aqui.</p>
      </aside>

      <main className="max-w-4xl mx-auto px-4 py-4 lg:px-8 lg:ml-60 lg:mr-60 lg:max-w-none">
        <Tabs defaultValue="chamados" className="w-full">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto mb-4">
            <TabsTrigger value="chamados" className="gap-1 px-1 text-xs sm:text-sm sm:gap-1.5 sm:px-3">
              <ClipboardList className="w-4 h-4 shrink-0" /> <span className="truncate">Chamados</span>
            </TabsTrigger>
            <TabsTrigger value="maquinas" className="gap-1 px-1 text-xs sm:text-sm sm:gap-1.5 sm:px-3">
              <Wrench className="w-4 h-4 shrink-0" /> <span className="truncate">Máquinas</span>
            </TabsTrigger>
            <TabsTrigger value="tecnicos" className="gap-1 px-1 text-xs sm:text-sm sm:gap-1.5 sm:px-3">
              <Users className="w-4 h-4 shrink-0" /> <span className="truncate">{isAnalista ? 'Usuários' : 'Técnicos'}</span>
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-1 px-1 text-xs sm:text-sm sm:gap-1.5 sm:px-3">
              <Package className="w-4 h-4 shrink-0" /> <span className="truncate">Fornecedores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chamados"><ChamadosTab /></TabsContent>
          <TabsContent value="maquinas"><MaquinasTab /></TabsContent>
          <TabsContent value="tecnicos">{isAnalista ? <UsuariosTab /> : <TecnicosTab />}</TabsContent>
          <TabsContent value="fornecedores"><FornecedoresTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
