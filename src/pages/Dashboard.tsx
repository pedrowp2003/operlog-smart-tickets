/**
 * Dashboard
 * ---------
 * Página principal do OperLog (rota /dashboard).
 * Monta o cabeçalho, painéis laterais (chat/notificações), as quatro abas
 * (Chamados, Máquinas, Técnicos/Usuários, Fornecedores) e o tratamento do
 * botão "voltar" do celular.
 */

// Hooks básicos do React para estado e ciclo de vida.
import { useEffect, useState } from 'react';
// Hook do React Router para navegação programática.
import { useNavigate } from 'react-router-dom';
// Acesso ao usuário logado e logout.
import { useAuth } from '@/contexts/AuthContext';
// Menu superior do usuário (perfil, sair).
import { UserMenu } from '@/components/UserMenu';
// Dialog que aparece no primeiro login (troca de senha obrigatória).
import { FirstLoginDialog } from '@/components/FirstLoginDialog';
// Conteúdos das quatro abas principais.
import { ChamadosTab } from '@/components/ChamadosTab';
import { MaquinasTab } from '@/components/MaquinasTab';
import { TecnicosTab } from '@/components/TecnicosTab';
import { UsuariosTab } from '@/components/UsuariosTab';
import { FornecedoresTab } from '@/components/FornecedoresTab';
// Componentes de UI do shadcn para o sistema de abas.
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Ícones usados no cabeçalho e nas abas.
import { ClipboardList, Wrench, Users, Package, Bell, Medal, Hammer, ClipboardCheck, MessageSquare } from 'lucide-react';
// Busca global (lupa no header).
import { GlobalSearch } from '@/components/GlobalSearch';
import { Button } from '@/components/ui/button';
// Rótulos legíveis para cada cargo (gerente, coordenador, etc.).
import { ROLE_LABELS, UserRole } from '@/types';
// Popover (chat mobile) e Sheet (notificações mobile).
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// Lista de notificações e contador de não-lidas.
import { NotificationsList, useUnreadCount } from '@/components/NotificationsList';
// Dialog de confirmação (usado ao sair pelo botão voltar).
import { useConfirm } from '@/components/ConfirmDialog';
// Logo do app importada como asset para o Vite gerar hash de cache.
import logo from '@/assets/operlog-logo.png';

export default function Dashboard() {
  // Usuário, flag de carregamento e função de logout vindos do contexto.
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();             // Para redirecionar se não estiver logado.
  const confirm = useConfirm();               // Dialog "Tem certeza?" reutilizável.
  const [activeTab, setActiveTab] = useState<string>('chamados'); // Aba ativa.
  const unread = useUnreadCount();            // Quantidade de notificações não lidas (badge).

  // Escuta o evento global `app:focus` (disparado pela busca global) e troca de aba.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind: string };
      if (!detail) return;
      // Mapeia o tipo do resultado clicado para a aba correspondente.
      if (detail.kind === 'chamado') setActiveTab('chamados');
      else if (detail.kind === 'maquina') setActiveTab('maquinas');
      else if (detail.kind === 'fornecedor') setActiveTab('fornecedores');
      else if (detail.kind === 'tecnico' || detail.kind === 'usuario') setActiveTab('tecnicos');
    };
    window.addEventListener('app:focus', handler as EventListener);
    return () => window.removeEventListener('app:focus', handler as EventListener);
  }, []);

  // Proteção de rota: se acabou de carregar e não há usuário, manda para a landing.
  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  // Larguras dos painéis laterais (chat / notificações) — persistidas em localStorage.
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('panel-left-width'));
    return v >= 240 && v <= 600 ? v : 360; // Clamp + fallback para 360.
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('panel-right-width'));
    return v >= 240 && v <= 600 ? v : 360;
  });

  // Sempre que o tamanho mudar, salva no localStorage para a próxima visita.
  useEffect(() => { localStorage.setItem('panel-left-width', String(leftWidth)); }, [leftWidth]);
  useEffect(() => { localStorage.setItem('panel-right-width', String(rightWidth)); }, [rightWidth]);

  // Botão "voltar" do celular: se houver overlay aberto, fecha; senão pergunta antes de sair.
  useEffect(() => {
    // Marca a entrada de histórico atual como "guardada" para detectarmos o popstate.
    const sentinel = { __overlayGuard: true };
    if (!(window.history.state && (window.history.state as any).__overlayGuard)) {
      window.history.pushState(sentinel, '');
    }
    const onPop = async () => {
      // Procura algum dialog/popover/sheet aberto no DOM.
      const overlay = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-popper-content-wrapper]'
      );
      if (overlay) {
        // Fecha o overlay simulando ESC e reempurra a sentinela no histórico.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        window.history.pushState(sentinel, '');
        return;
      }
      // Sem overlay aberto: confirma a saída do app antes de deslogar.
      window.history.pushState(sentinel, '');
      const ok = await confirm({
        title: 'Tem certeza que deseja sair?',
        confirmText: 'Sair',
        cancelText: 'Cancelar',
      });
      if (ok) {
        await logout();
        navigate('/');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [confirm, logout, navigate]);

  // Acompanha o breakpoint "lg" (≥1024px) para aplicar margens dos painéis laterais.
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Tela de espera enquanto resolvemos a sessão.
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  // Sem usuário: o useEffect acima já redireciona; aqui só evitamos render incompleto.
  if (!user) return null;

  // Atalho usado em vários lugares (mostra "Usuários" ao invés de "Técnicos" para analistas).
  const isAnalista = user.role === 'analista';

  // Handler de arrastar para redimensionar painéis laterais via mouse.
  const startResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;                                   // Posição X inicial do mouse.
    const startW = side === 'left' ? leftWidth : rightWidth;    // Largura no início do arrasto.
    const onMove = (ev: MouseEvent) => {
      // O painel direito cresce quando o mouse vai para a esquerda → inverte o sinal do delta.
      const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.min(600, Math.max(240, startW + delta)); // Clamp [240, 600].
      if (side === 'left') setLeftWidth(next); else setRightWidth(next);
    };
    const onUp = () => {
      // Encerra a operação e remove os listeners temporários.
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';                    // Evita seleção de texto durante o arrasto.
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="min-h-screen bg-background">
      <FirstLoginDialog />
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="OperLog" width={28} height={28} />
            <span className="font-bold text-primary text-base sm:text-lg truncate">OperLog</span>
          <GlobalSearch />
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
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative lg:hidden" aria-label="Notificações">
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[92vw] max-w-sm p-4 flex flex-col gap-2 h-dvh max-h-dvh overflow-hidden">
                <NotificationsList compact />
              </SheetContent>
            </Sheet>
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
              <span className="hidden sm:inline shrink-0 text-[11px] leading-tight text-muted-foreground sm:text-xs">
                {user.role === 'tecnico' ? 'Técnico' : user.role === 'analista' ? 'Analista' : ROLE_LABELS[user.role as UserRole]}
              </span>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Desktop side panels */}
      <aside style={{ width: leftWidth }} className="hidden lg:flex fixed left-4 top-[4.5rem] bottom-4 border border-border rounded-lg bg-card flex-col p-4 gap-2 z-40 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="w-4 h-4" /> Chat interno
        </div>
        <p className="text-xs text-muted-foreground">Em breve novas funções aparecerão aqui.</p>
        <div
          onMouseDown={startResize('left')}
          className="hidden lg:block absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 rounded-r-lg"
          aria-label="Redimensionar painel"
        />
      </aside>
      <aside style={{ width: rightWidth }} className="hidden lg:flex fixed right-4 top-[4.5rem] bottom-4 border border-border rounded-lg bg-card flex-col p-4 gap-2 z-40 shadow-sm">
        <div
          onMouseDown={startResize('right')}
          className="hidden lg:block absolute top-0 left-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 rounded-l-lg"
          aria-label="Redimensionar painel"
        />
        <NotificationsList />
      </aside>

      <main
        style={isLg ? { marginLeft: `calc(${leftWidth}px + 2rem)`, marginRight: `calc(${rightWidth}px + 2rem)` } : undefined}
        className="max-w-4xl mx-auto px-4 py-4 lg:px-8 lg:max-w-none"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          <TabsContent value="chamados" forceMount className="data-[state=inactive]:hidden"><ChamadosTab /></TabsContent>
          <TabsContent value="maquinas" forceMount className="data-[state=inactive]:hidden"><MaquinasTab /></TabsContent>
          <TabsContent value="tecnicos" forceMount className="data-[state=inactive]:hidden">{isAnalista ? <UsuariosTab /> : <TecnicosTab />}</TabsContent>
          <TabsContent value="fornecedores" forceMount className="data-[state=inactive]:hidden"><FornecedoresTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
