import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { StatusChamado, CategoriaChamado, CATEGORIAS, STATUS_LIST, getStatusColor, getStatusBgColor, formatPhone, UNIDADES, ARMAZENS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Wrench, User, ClipboardList, ChevronUp, ChevronDown, Package, X, Pencil, Hammer, Filter, Search, ClipboardCheck, AlertTriangle, Archive, EyeOff, Eye, Truck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';
import { useConfirm } from '@/components/ConfirmDialog';

type Chamado = Tables<'chamados'>;
type Maquina = Tables<'maquinas'>;
type Acao = Tables<'chamado_acoes'>;
type Fornecedor = Tables<'fornecedores'>;

const MAX_DESC = 500;
const MAX_ACAO = 300;
const MAX_COD_ERRO = 50;

export function ChamadosTab() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [tiposPrioritarios, setTiposPrioritarios] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailChamado, setDetailChamado] = useState<Chamado | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showFornecedores, setShowFornecedores] = useState(false);
  const [meusChamados, setMeusChamados] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterLocal, setFilterLocal] = useState<string>('todos');
  const [filterMaquina, setFilterMaquina] = useState<string>('todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const isMobile = useIsMobile();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = async (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: string; id: string };
      if (!d || d.kind !== 'chamado') return;
      const { data } = await supabase.from('chamados').select('*').eq('id', d.id).maybeSingle();
      if (data) setDetailChamado(data as Chamado);
    };
    window.addEventListener('app:focus', handler as EventListener);
    return () => window.removeEventListener('app:focus', handler as EventListener);
  }, []);

  const [descricao, setDescricao] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [situacao, setSituacao] = useState<'Parada' | 'Operando com restrições'>('Parada');
  const [fotoDefeito, setFotoDefeito] = useState<string | undefined>(undefined);
  const [fotoDefeitoFile, setFotoDefeitoFile] = useState<File | null>(null);
  const [codigoErro, setCodigoErro] = useState('');
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaChamado>('Manutenção corretiva');

  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [novaAcao, setNovaAcao] = useState('');
  const [novoFornId, setNovoFornId] = useState<string>('none');
  const [novoValor, setNovoValor] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTec1, setAssignTec1] = useState<string>('none');
  const [assignTec2, setAssignTec2] = useState<string>('none');
  const [assignCategoria, setAssignCategoria] = useState<CategoriaChamado>('Manutenção corretiva');
  const [editAcao, setEditAcao] = useState<Acao | null>(null);
  const [editAcaoDesc, setEditAcaoDesc] = useState('');
  const [editAcaoForn, setEditAcaoForn] = useState<string>('none');
  const [editAcaoValor, setEditAcaoValor] = useState('');
  const [progressoLocal, setProgressoLocal] = useState<number | null>(null);

  const [prevDataStr, setPrevDataStr] = useState('');
  const [prevHoraStr, setPrevHoraStr] = useState('');

  // Despacho ao concluir
  const [despachoOpen, setDespachoOpen] = useState(false);
  const [despachoDesc, setDespachoDesc] = useState('');

  const fetchData = async () => {
    const [cRes, mRes, pRes, fRes, tRes] = await Promise.all([
      supabase.from('chamados').select('*').order('created_at', { ascending: false }),
      supabase.from('maquinas').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('fornecedores').select('*'),
      supabase.from('maquina_tipos').select('nome,prioridade'),
    ]);
    if (cRes.data) setChamados(cRes.data);
    if (mRes.data) setMaquinas(mRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (fRes.data) setFornecedores(fRes.data);
    if (tRes.data) {
      setTiposPrioritarios(new Set(
        (tRes.data as any[]).filter(t => t.prioridade).map(t => t.nome)
      ));
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchAcoes = async (chamadoId: string) => {
    const { data } = await supabase.from('chamado_acoes').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: false });
    if (data) setAcoes(data);
  };

  useEffect(() => {
    if (detailChamado) fetchAcoes(detailChamado.id);
    else setAcoes([]);
  }, [detailChamado?.id]);

  useEffect(() => {
    setPrevDataStr(detailChamado ? toDateInput(detailChamado.data_prevista_termino) : '');
    setPrevHoraStr(detailChamado ? toTimeInput(detailChamado.data_prevista_termino) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailChamado?.id, detailChamado?.data_prevista_termino]);

  useEffect(() => {
    if (detailChamado && assignOpen) {
      setAssignTec1(detailChamado.tecnico_id || 'none');
      setAssignTec2(detailChamado.tecnico2_id || 'none');
      setAssignCategoria((detailChamado.categoria as CategoriaChamado) || 'Manutenção corretiva');
    }
  }, [detailChamado?.id, assignOpen]);

  useEffect(() => {
    setProgressoLocal(detailChamado?.progresso ?? null);
  }, [detailChamado?.id, detailChamado?.progresso]);

  if (!user) return null;

  const isAnalista = user.role === 'analista';
  const isTecnico = user.role === 'tecnico';
  const canCreate = !isTecnico;
  const canArchive = isAnalista;

  const getMaquina = (id: string) => maquinas.find(m => m.id === id);
  const isMaquinaPrioritaria = (m: Maquina | undefined) =>
    !!m && (((m as any).prioridade === true) || tiposPrioritarios.has(m.tipo));
  const getProfile = (id: string | null) => id ? profiles.find(p => p.id === id) : null;
  const getFornecedor = (id: string | null) => id ? fornecedores.find(f => f.id === id) : null;

  const tecnicos = profiles.filter(p => p.role === 'tecnico');
  const countOpenChamadosByTecnico = (tecnicoId: string) => chamados.filter(c =>
    c.status !== 'Concluído' && (c.tecnico_id === tecnicoId || c.tecnico2_id === tecnicoId)
  ).length;

  const availableMaquinas = maquinas.filter((m) => {
    if (user.role === 'gerente' || isAnalista) return true;
    if (user.role === 'coordenador') return m.unidade === user.unidade;
    if (user.role === 'supervisor') return m.armazem === user.armazem;
    return false;
  });

  let filteredChamados = chamados;
  if (user.role === 'coordenador') {
    filteredChamados = chamados.filter(c => {
      const maq = getMaquina(c.maquina_id);
      return maq && maq.unidade === user.unidade;
    });
  } else if (user.role === 'supervisor') {
    filteredChamados = chamados.filter(c => {
      const maq = getMaquina(c.maquina_id);
      return maq && maq.armazem === user.armazem;
    });
  }
  if (meusChamados) {
    if (isTecnico) {
      filteredChamados = filteredChamados.filter(c => c.tecnico_id === user.id || c.tecnico2_id === user.id);
    } else {
      filteredChamados = filteredChamados.filter(c => c.criado_por === user.id);
    }
  }
  filteredChamados = filteredChamados.filter(c => {
    // Arquivados: somente analista; só aparecem quando filtro = 'arquivados'
    const isArquivado = c.status === 'Encerrado';
    if (filterStatus === 'arquivados') {
      if (!isAnalista || !isArquivado) return false;
    } else {
      if (isArquivado) return false;
      if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    }
    if (filterCategoria !== 'todas' && c.categoria !== filterCategoria) return false;
    if (filterMaquina !== 'todas' && c.maquina_id !== filterMaquina) return false;
    const maq = getMaquina(c.maquina_id);
    if (filterLocal !== 'todos') {
      if (filterLocal.startsWith('u:')) {
        if (maq?.unidade !== filterLocal.slice(2)) return false;
      } else if (filterLocal.startsWith('a:')) {
        if (maq?.armazem !== filterLocal.slice(2)) return false;
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const full = `${c.numero} ${c.descricao} ${maq?.tipo || ''} ${maq?.frota || ''}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  filteredChamados = [...filteredChamados].sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'numero_asc': return a.numero.localeCompare(b.numero);
      case 'numero_desc': return b.numero.localeCompare(a.numero);
      case 'progress_desc': return (b.progresso ?? 0) - (a.progresso ?? 0);
      case 'progress_asc': return (a.progresso ?? 0) - (b.progresso ?? 0);
      case 'recent':
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleCreate = async () => {
    if (!descricao.trim() || !maquinaId) return;
    const now = new Date().toISOString();
    let fotoUrl: string | null = null;
    if (fotoDefeitoFile) {
      const ext = fotoDefeitoFile.name.split('.').pop() || 'jpg';
      const path = `chamados/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('images').upload(path, fotoDefeitoFile);
      if (upErr) {
        toast.error('Erro ao enviar foto do defeito');
      } else {
        fotoUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
      }
    }
    await supabase.from('chamados').insert({
      numero: 'TEMP',
      descricao: descricao.trim().toUpperCase(),
      maquina_id: maquinaId,
      situacao_maquina: situacao,
      criado_por: user.id,
      data_inicio: now,
      foto_defeito_url: fotoUrl,
      codigo_erro: codigoErro.trim() ? codigoErro.trim().toUpperCase() : null,
    });
    setCreateOpen(false);
    setDescricao('');
    setMaquinaId('');
    setFotoDefeito(undefined);
    setFotoDefeitoFile(null);
    setCodigoErro('');
    fetchData();
  };

  // Técnico aceita o chamado
  const handleAccept = async () => {
    if (!detailChamado) return;
    const isSecond = !!(detailChamado.tecnico_id && detailChamado.tecnico_id !== user.id);
    const updates: Partial<Chamado> = {};
    if (!isSecond) updates.categoria = categoria;
    if (!detailChamado.tecnico_id) {
      updates.tecnico_id = user.id;
      updates.status = 'Em andamento';
    } else if (detailChamado.tecnico_id !== user.id && !detailChamado.tecnico2_id) {
      updates.tecnico2_id = user.id;
    } else {
      toast.error('Este chamado já tem dois técnicos');
      return;
    }
    const { data, error } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setDetailChamado(data);
    setAcceptOpen(false);
    fetchData();
  };

  const canEditChamado = (c: Chamado) => {
    if (isAnalista) return true;
    return c.tecnico_id === user.id || c.tecnico2_id === user.id;
  };

  const handleStatusChange = async (newStatus: StatusChamado) => {
    if (!detailChamado || !canEditChamado(detailChamado)) return;
    if (newStatus === 'Encerrado' && !isAnalista) {
      toast.error('Apenas analistas podem encerrar chamados');
      return;
    }
    if (newStatus === 'Concluído') {
      // Abre fluxo de despacho
      setDespachoDesc(detailChamado.servico_descricao || '');
      setDespachoOpen(true);
      return;
    }
    const updates: Partial<Chamado> = { status: newStatus };
    if (newStatus === 'Aberto') updates.progresso = 0;
    const { data } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleDespachar = async () => {
    if (!detailChamado) return;
    if (!despachoDesc.trim()) {
      toast.error('Descreva o serviço realizado antes de despachar');
      return;
    }
    const { data } = await supabase
      .from('chamados')
      .update({ status: 'Concluído', progresso: 100, servico_descricao: despachoDesc.trim().toUpperCase() })
      .eq('id', detailChamado.id)
      .select()
      .single();
    if (data) setDetailChamado(data as Chamado);
    setDespachoOpen(false);
    setDespachoDesc('');
    fetchData();
  };

  const handleCategoriaChange = async (newCat: CategoriaChamado) => {
    if (!detailChamado || !canEditChamado(detailChamado)) return;
    const { data } = await supabase.from('chamados').update({ categoria: newCat }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleProgressoChange = async (val: number) => {
    if (!detailChamado || !isAnalista) return;
    if (!canEditChamado(detailChamado)) return;
    const updates: Partial<Chamado> = { progresso: val };
    if (val >= 100) updates.status = 'Concluído';
    const { data } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleDataPrevistaChange = async (iso: string) => {
    if (!detailChamado || !isAnalista) return;
    if (!canEditChamado(detailChamado)) return;
    if (iso && detailChamado.data_inicio && new Date(iso) < new Date(detailChamado.data_inicio)) {
      toast.error('Previsão de término não pode ser anterior à data de início');
      setPrevDataStr(toDateInput(detailChamado.data_prevista_termino));
      setPrevHoraStr(toTimeInput(detailChamado.data_prevista_termino));
      return;
    }
    const { data } = await supabase.from('chamados').update({ data_prevista_termino: iso || null }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleAddAcao = async () => {
    if (!detailChamado || !novaAcao.trim()) return;
    const valorNum = novoValor ? parseFloat(novoValor.replace(',', '.')) : null;
    await supabase.from('chamado_acoes').insert({
      chamado_id: detailChamado.id,
      tecnico_id: user.id,
      descricao: novaAcao.trim().toUpperCase(),
      fornecedor_id: novoFornId === 'none' ? null : novoFornId,
      valor: valorNum,
    });
    setNovaAcao('');
    setNovoFornId('none');
    setNovoValor('');
    fetchAcoes(detailChamado.id);
  };

  const handleArchiveChamado = async (id: string) => {
    if (!isAnalista) return;
    const ok = await confirm({
      title: 'Arquivar chamado?',
      description: 'O chamado terá status "Encerrado" e ficará disponível apenas no filtro de arquivados.',
      confirmText: 'Arquivar',
    });
    if (!ok) return;
    await supabase.from('chamados').update({ status: 'Encerrado' }).eq('id', id);
    setDetailChamado(null);
    fetchData();
  };

  const handleSaveAssign = async () => {
    if (!detailChamado || !isAnalista) return;
    const t1 = assignTec1 === 'none' ? null : assignTec1;
    const t2 = assignTec2 === 'none' ? null : assignTec2;
    const hadAnyTec = !!(detailChamado.tecnico_id || detailChamado.tecnico2_id);
    const willHaveAny = !!(t1 || t2);
    const updates: Partial<Chamado> = { tecnico_id: t1, tecnico2_id: t2, categoria: assignCategoria };
    if (!hadAnyTec && willHaveAny && detailChamado.status === 'Aberto') {
      updates.status = 'Em andamento';
    }
    if (hadAnyTec && !willHaveAny) {
      updates.status = 'Aguardando mão de obra';
    }
    const { data, error } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setDetailChamado(data);
    setAssignOpen(false);
    fetchData();
  };

  const openEditAcao = (a: Acao) => {
    setEditAcao(a);
    setEditAcaoDesc(a.descricao);
    setEditAcaoForn(a.fornecedor_id || 'none');
    setEditAcaoValor(a.valor != null ? String(a.valor) : '');
  };
  const handleSaveEditAcao = async () => {
    if (!editAcao) return;
    const valorNum = editAcaoValor ? parseFloat(editAcaoValor.replace(',', '.')) : null;
    await supabase.from('chamado_acoes').update({
      descricao: editAcaoDesc.trim().toUpperCase(),
      fornecedor_id: editAcaoForn === 'none' ? null : editAcaoForn,
      valor: valorNum,
    }).eq('id', editAcao.id);
    setEditAcao(null);
    if (detailChamado) fetchAcoes(detailChamado.id);
  };
  const handleToggleDesconsiderada = async (a: Acao) => {
    if (!isAnalista) return;
    await supabase.from('chamado_acoes').update({ desconsiderada: !((a as any).desconsiderada) } as any).eq('id', a.id);
    if (detailChamado) fetchAcoes(detailChamado.id);
  };
  const maskDate = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
    return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
  };
  const maskTime = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0,2)}:${d.slice(2)}`;
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const toDateInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const toTimeInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const combineDateTime = (dateStr: string, timeStr: string): string | null => {
    // dateStr: DD/MM/YYYY ; timeStr: HH:MM
    const dm = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const tm = timeStr.match(/^(\d{2}):(\d{2})$/);
    if (!dm || !tm) return null;
    const d = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]), Number(tm[1]), Number(tm[2]));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const selectedMaquinaForCreate = maquinaId ? getMaquina(maquinaId) : null;

  // Técnicos podem ser atrelados a múltiplos chamados simultaneamente
  const tecnicosLivres = (_excluindoSlot?: 1 | 2): Profile[] => tecnicos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">Chamados</h2>
        <div className="flex gap-1 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Filtrar" className="h-9 w-9 p-0"><Filter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-2">
              <div><Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {STATUS_LIST.filter(s => s !== 'Encerrado').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    {isAnalista && <SelectItem value="arquivados">Arquivados</SelectItem>}
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Unidade/Armazém</Label>
                <Select value={filterLocal} onValueChange={setFilterLocal}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {UNIDADES.map(u => <SelectItem key={`u:${u}`} value={`u:${u}`}>{u}</SelectItem>)}
                    {ARMAZENS.map(a => <SelectItem key={`a:${a}`} value={`a:${a}`}>{a}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Máquina</Label>
                <Select value={filterMaquina} onValueChange={setFilterMaquina}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="todas">Todas</SelectItem>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.tipo} {m.frota}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Tipo de serviço</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="todas">Todas</SelectItem>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Ordenar por</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recente</SelectItem>
                    <SelectItem value="oldest">Menos recente</SelectItem>
                    <SelectItem value="numero_asc">Número (A→Z)</SelectItem>
                    <SelectItem value="numero_desc">Número (Z→A)</SelectItem>
                    <SelectItem value="progress_desc">Progresso (maior→menor)</SelectItem>
                    <SelectItem value="progress_asc">Progresso (menor→maior)</SelectItem>
                  </SelectContent>
                </Select></div>
            </PopoverContent>
          </Popover>
          {isAnalista && (
            <Button variant="outline" size="sm" onClick={() => setRelatoriosOpen(true)} aria-label="Relatórios" title="Relatórios">
              <ClipboardCheck className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Relatórios</span>
            </Button>
          )}
          <Button variant={meusChamados ? 'default' : 'outline'} size="sm" onClick={() => setMeusChamados(!meusChamados)}>
            <span className="hidden sm:inline">Meus Chamados</span><span className="sm:hidden">Meus</span>
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Chamado</span>
            </Button>
          )}
        </div>
      </div>

      {filteredChamados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum chamado encontrado</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {filteredChamados.map((chamado) => {
            const maquina = getMaquina(chamado.maquina_id);
            let abertoBorder = '';
            if (isAnalista && chamado.status === 'Aberto') {
              const mins = (Date.now() - new Date(chamado.created_at).getTime()) / 60000;
              if (mins >= 180) abertoBorder = 'border-2 border-destructive';
              else if (mins >= 120) abertoBorder = 'border-2 border-orange-500';
              else if (mins >= 60) abertoBorder = 'border-2 border-yellow-500';
              void tick;
            }
            return (
              <Card key={chamado.id} className={`p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start ${abertoBorder}`} onClick={() => setDetailChamado(chamado)}>
                {maquina?.foto_url ? (
                  <img src={maquina.foto_url} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{chamado.numero}</span>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(chamado.status as StatusChamado)} ${getStatusBgColor(chamado.status as StatusChamado)} border-0`}>
                      {chamado.status.replace(/^Aguardando/, 'Ag.')}
                    </Badge>
                    <span className="hidden sm:inline text-xs font-medium text-primary ml-auto">{chamado.progresso ?? 0}%</span>
                  </div>
                  {maquina && (
                    <>
                      <p className="text-sm font-medium break-words flex items-center gap-1">
                        {isMaquinaPrioritaria(maquina) && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                        <span>{maquina.tipo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        <span>{maquina.marca} {maquina.modelo} {maquina.frota}</span>
                        <span className="hidden sm:inline"> - {maquina.unidade || maquina.armazem}</span>
                        <span className="sm:hidden block">{maquina.unidade || maquina.armazem}</span>
                      </p>
                    </>
                  )}
                  {chamado.categoria && <span className="text-xs text-muted-foreground">{chamado.categoria}</span>}
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10 sm:w-auto">
                  {canArchive && chamado.status !== 'Encerrado' && (
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-6 w-6 p-0" title="Arquivar (encerrar) chamado" onClick={(e) => { e.stopPropagation(); handleArchiveChamado(chamado.id); }}>
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  <span className="sm:hidden text-[11px] font-medium text-primary">{chamado.progresso ?? 0}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Chamado</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Máquina *</Label>
              <Select value={maquinaId} onValueChange={setMaquinaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {availableMaquinas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.tipo} {m.frota} ({m.unidade || m.armazem})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaquinaForCreate?.foto_url && (
                <img src={selectedMaquinaForCreate.foto_url} alt="" className="w-full rounded-lg object-contain max-h-40 mt-2" />
              )}
            </div>
            <div>
              <Label>Situação da Máquina *</Label>
              <Select value={situacao} onValueChange={(v) => setSituacao(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Parada">Parada</SelectItem>
                  <SelectItem value="Operando com restrições">Operando com restrições</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição * ({descricao.length}/{MAX_DESC})</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.toUpperCase().slice(0, MAX_DESC))}
                placeholder="DESCREVA O PROBLEMA..."
                rows={3}
                maxLength={MAX_DESC}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <Label>Código de erro (opcional)</Label>
              <Input
                value={codigoErro}
                onChange={(e) => setCodigoErro(e.target.value.toUpperCase().slice(0, MAX_COD_ERRO))}
                placeholder="EX: E-204"
                maxLength={MAX_COD_ERRO}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <Label>Foto do defeito (opcional)</Label>
              <ImageUpload
                value={fotoDefeito}
                onChange={(val, file) => {
                  setFotoDefeito(val);
                  setFotoDefeitoFile(file ?? null);
                }}
                label="Tirar, anexar ou arrastar foto"
                className="mt-1"
              />
            </div>
            <Button onClick={handleCreate} disabled={!descricao.trim() || !maquinaId}>Criar Chamado</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detailChamado} onOpenChange={() => { setDetailChamado(null); setShowInfo(false); setShowFornecedores(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden lg:max-w-5xl">
          {detailChamado && (() => {
            const maquina = getMaquina(detailChamado.maquina_id);
            const tecnico = getProfile(detailChamado.tecnico_id);
            const tecnico2 = getProfile(detailChamado.tecnico2_id);
            const progresso = detailChamado.progresso ?? 0;
            const dataInicio = detailChamado.data_inicio;
            const dataPrevista = detailChamado.data_prevista_termino;
            const editavel = canEditChamado(detailChamado);
            const podeAceitar = isTecnico && (
              !detailChamado.tecnico_id ||
              (detailChamado.tecnico_id !== user.id && !detailChamado.tecnico2_id)
            );
            const showInfoEffective = showInfo || !isMobile;
            return (
              <>
                <DialogHeader><DialogTitle>Chamado {detailChamado.numero}</DialogTitle></DialogHeader>
                <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {editavel ? (
                    <Select value={detailChamado.status} onValueChange={(v) => handleStatusChange(v as StatusChamado)}>
                      <SelectTrigger className="w-auto h-8 text-sm font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`text-sm px-3 py-1 font-semibold ${getStatusColor(detailChamado.status as StatusChamado)} ${getStatusBgColor(detailChamado.status as StatusChamado)} border-0`}>
                      {detailChamado.status}
                    </Badge>
                  )}
                </div>

                {maquina?.foto_url && <img src={maquina.foto_url} alt="" className="w-full rounded-lg object-contain max-h-64" />}

                <div className="space-y-1 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Andamento</span>
                    <span className="text-xs font-medium">{progressoLocal ?? progresso}%</span>
                  </div>
                  {isAnalista && editavel && detailChamado.status !== 'Aberto' && detailChamado.status !== 'Concluído' ? (
                    <Slider
                      value={[progressoLocal ?? progresso]}
                      onValueChange={(v) => setProgressoLocal(v[0])}
                      onValueCommit={(v) => handleProgressoChange(v[0])}
                      max={100}
                      step={5}
                    />
                  ) : (
                    <Progress value={progresso} className="h-2" />
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {maquina && (
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-muted-foreground">Tipo:</span><span>{maquina.tipo}</span>
                      <span className="text-muted-foreground">Frota:</span><span>{maquina.frota}</span>
                      <span className="text-muted-foreground">Marca:</span><span>{maquina.marca}</span>
                      <span className="text-muted-foreground">Modelo:</span><span>{maquina.modelo}</span>
                      {maquina.unidade && (<><span className="text-muted-foreground">Unidade:</span><span>{maquina.unidade}</span></>)}
                      {maquina.armazem && !maquina.unidade && (<><span className="text-muted-foreground">Armazém:</span><span>{maquina.armazem}</span></>)}
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground">Situação: <span className="text-foreground">{detailChamado.situacao_maquina}</span></p>
                    <p className="text-muted-foreground">Descrição:</p>
                    <p className="break-words whitespace-pre-wrap">{detailChamado.descricao}</p>
                    {detailChamado.categoria && (
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className="text-muted-foreground">Tipo de serviço:</span>
                        {editavel ? (
                          <Select value={detailChamado.categoria} onValueChange={(v) => handleCategoriaChange(v as CategoriaChamado)}>
                            <SelectTrigger className="w-auto h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{detailChamado.categoria}</span>
                        )}
                      </div>
                    )}
                    {detailChamado.codigo_erro && (
                      <p className="mt-2"><span className="text-muted-foreground">Código de erro: </span><span className="font-semibold">{detailChamado.codigo_erro}</span></p>
                    )}
                    {detailChamado.foto_defeito_url && (
                      <div className="mt-2">
                        <p className="text-muted-foreground mb-1">Foto do defeito:</p>
                        <img
                          src={detailChamado.foto_defeito_url}
                          alt="Defeito"
                          className="w-full rounded-lg object-contain max-h-64 cursor-zoom-in border border-border"
                          loading="eager"
                          decoding="async"
                          // @ts-ignore
                          fetchpriority="high"
                          onClick={() => setZoomImg(detailChamado.foto_defeito_url!)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Data de Início:</span>
                      <span>{formatDateTime(dataInicio)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground flex-shrink-0">Previsão de Término:</span>
                      {isAnalista && editavel ? (
                        <div className="flex gap-1 items-center flex-shrink-0 ml-auto">
                          <Input
                            value={prevDataStr}
                            onChange={(e) => setPrevDataStr(maskDate(e.target.value))}
                            onBlur={() => {
                              const iso = combineDateTime(prevDataStr, prevHoraStr || '00:00');
                              if (iso) handleDataPrevistaChange(iso);
                              else if (!prevDataStr && !prevHoraStr) handleDataPrevistaChange('');
                            }}
                            placeholder="__/__/____"
                            className="h-8 text-xs w-[88px] flex-shrink-0 text-center px-1"
                            inputMode="numeric"
                          />
                          <Input
                            value={prevHoraStr}
                            onChange={(e) => setPrevHoraStr(maskTime(e.target.value))}
                            onBlur={() => {
                              const iso = combineDateTime(prevDataStr, prevHoraStr || '00:00');
                              if (iso) handleDataPrevistaChange(iso);
                            }}
                            placeholder="00:00"
                            className="h-8 text-xs w-[52px] flex-shrink-0 text-center px-1"
                            inputMode="numeric"
                          />
                        </div>
                      ) : (
                        <span className="ml-auto">{dataPrevista ? formatDateTime(dataPrevista) : '__/__/____ 00:00'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-2 sm:flex-row">
                  {podeAceitar && (
                    <Button size="sm" className="order-1 sm:order-2 px-3 text-sm" onClick={() => {
                      if (detailChamado.tecnico_id && detailChamado.tecnico_id !== user.id) {
                        handleAccept();
                      } else {
                        setAcceptOpen(true);
                      }
                    }}>Aceitar Chamado</Button>
                  )}
                  {isAnalista && (
                    <Button size="sm" variant="outline" className="order-1 sm:order-3 px-3 text-sm" onClick={() => setAssignOpen(true)}>Gerenciar técnicos</Button>
                  )}
                  <Button variant="outline" size="sm" className="order-2 sm:order-1 px-3 text-sm lg:hidden" onClick={() => setShowInfo(!showInfo)}>
                    <User className="w-3.5 h-3.5 mr-1" /> Dados do Chamado
                    {showInfo ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 ml-1" />}
                  </Button>
                </div>
                </div>
                <div className="space-y-2 lg:border-l lg:border-border lg:pl-4 mt-4 lg:mt-0">
                <p className="hidden lg:block text-sm font-semibold">Dados do chamado</p>
                {showInfoEffective && (
                  <div className="border border-border rounded-lg p-3 mt-2 space-y-2 w-full">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Hammer className="w-4 h-4 flex-shrink-0" /> Técnicos atribuídos
                    </p>
                    {!tecnico && !tecnico2 ? (
                      <p className="text-sm text-muted-foreground">Nenhum técnico atribuído</p>
                    ) : (
                      <div className="space-y-2">
                        {tecnico && <TecnicoRow profile={tecnico} />}
                        {tecnico2 && <TecnicoRow profile={tecnico2} />}
                      </div>
                    )}
                  </div>
                )}

                {showInfoEffective && (() => {
                  const ids = Array.from(new Set(acoes.map(a => a.fornecedor_id).filter(Boolean) as string[]));
                  const list = ids.map(id => getFornecedor(id)).filter(Boolean) as Fornecedor[];
                  return (
                    <div className="border border-border rounded-lg p-3 mt-2 space-y-2 w-full">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Package className="w-4 h-4 flex-shrink-0" /> Fornecedores
                      </p>
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum fornecedor envolvido</p>
                      ) : (
                        <div className="space-y-2">
                          {list.map(f => (
                            <div key={f.id} className="flex items-center gap-2">
                              {f.foto_url ? (
                                <img src={f.foto_url} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-contain bg-muted flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="text-sm flex-1 min-w-0">
                                <p className="font-medium break-words">{f.nome}</p>
                                <p className="text-muted-foreground text-xs break-words">{(f as any).natureza}</p>
                                <p className="text-muted-foreground text-xs">{formatPhone(f.telefone)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {showInfoEffective && (
                  <div className="border border-border rounded-lg p-3 mt-2 space-y-2 w-full">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <ClipboardList className="w-4 h-4 flex-shrink-0" /> Ações realizadas
                    </p>
                    {editavel && (
                      <div className="space-y-2 mb-2">
                        <Textarea
                          value={novaAcao}
                          onChange={(e) => setNovaAcao(e.target.value.toUpperCase().slice(0, MAX_ACAO))}
                          placeholder="DESCREVA A AÇÃO..."
                          rows={2}
                          maxLength={MAX_ACAO}
                          className="text-xs"
                          style={{ textTransform: 'uppercase' }}
                        />
                        <span className="text-[10px] text-muted-foreground">{novaAcao.length}/{MAX_ACAO}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select value={novoFornId} onValueChange={setNovoFornId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fornecedor (opcional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem fornecedor</SelectItem>
                              {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input
                            inputMode="decimal"
                            placeholder="Valor R$"
                            value={novoValor}
                            onChange={e => setNovoValor(e.target.value.replace(/[^\d.,]/g, ''))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button size="sm" onClick={handleAddAcao} disabled={!novaAcao.trim()} className="w-full">
                          <Plus className="w-4 h-4 mr-1" /> Adicionar Ação
                        </Button>
                      </div>
                    )}
                    {acoes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma ação registrada</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {acoes.map((acao) => {
                          const d = new Date(acao.created_at);
                          const dataFormatada = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                          const fornecedor = getFornecedor(acao.fornecedor_id);
                          return (
                            <div key={acao.id} className="bg-muted rounded p-2 space-y-1">
                              <p className="text-xs break-words whitespace-pre-wrap">{acao.descricao}</p>
                              {fornecedor && (
                                <div className="text-xs pt-1 border-t border-border/40 flex items-center gap-2 flex-wrap">
                                  <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium break-all flex-1 min-w-0">{fornecedor.nome}</span>
                                  {acao.valor != null && (
                                    <span className="text-[11px] font-medium text-primary flex-shrink-0 ml-auto">R$ {Number(acao.valor).toFixed(2).replace('.', ',')}</span>
                                  )}
                                </div>
                              )}
                              {!fornecedor && acao.valor != null && (
                                <p className="text-[11px] font-medium text-primary">R$ {Number(acao.valor).toFixed(2).replace('.', ',')}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[10px] text-muted-foreground break-all">{dataFormatada}</p>
                                {isAnalista && (
                                  <div className="flex gap-1 ml-auto">
                                    <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => openEditAcao(acao)}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-muted-foreground"
                                      title={(acao as any).desconsiderada ? 'Reconsiderar ação' : 'Desconsiderar ação'}
                                      onClick={() => handleToggleDesconsiderada(acao)}
                                    >
                                      {(acao as any).desconsiderada ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Accept */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aceitar Chamado</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            {detailChamado && !detailChamado.tecnico_id && (
              <>
                <div>
                  <Label>Tipo de serviço *</Label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaChamado)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Ao aceitar, o status irá para "Em andamento" automaticamente.</p>
              </>
            )}
            <Button onClick={handleAccept}>Aceitar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign técnicos (analista) */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerenciar técnicos</DialogTitle></DialogHeader>
          {detailChamado && (
            <div className="flex flex-col gap-4">
              {!detailChamado.categoria && (
                <div>
                  <Label>Tipo de serviço *</Label>
                  <Select value={assignCategoria} onValueChange={(v) => setAssignCategoria(v as CategoriaChamado)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Técnico principal</Label>
                <Select value={assignTec1} onValueChange={setAssignTec1}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {tecnicosLivres(1).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span>{t.nome} {t.sobrenome}</span>
                          <span className="text-primary font-semibold text-xs">({countOpenChamadosByTecnico(t.id)})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Segundo técnico</Label>
                <Select value={assignTec2} onValueChange={setAssignTec2}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {tecnicosLivres(2).filter(t => t.id !== assignTec1).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span>{t.nome} {t.sobrenome}</span>
                          <span className="text-primary font-semibold text-xs">({countOpenChamadosByTecnico(t.id)})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAssign}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoom de imagem */}
      <Dialog open={!!zoomImg} onOpenChange={() => setZoomImg(null)}>
        <DialogContent className="max-w-4xl p-2">
          {zoomImg && <img src={zoomImg} alt="" className="w-full h-auto object-contain max-h-[85vh]" />}
        </DialogContent>
      </Dialog>

      {/* Editar ação */}
      <Dialog open={!!editAcao} onOpenChange={() => setEditAcao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar ação</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea
              value={editAcaoDesc}
              onChange={(e) => setEditAcaoDesc(e.target.value.toUpperCase().slice(0, MAX_ACAO))}
              rows={3}
              maxLength={MAX_ACAO}
              style={{ textTransform: 'uppercase' }}
            />
            <Select value={editAcaoForn} onValueChange={setEditAcaoForn}>
              <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fornecedor</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              inputMode="decimal"
              placeholder="Valor R$"
              value={editAcaoValor}
              onChange={(e) => setEditAcaoValor(e.target.value.replace(/[^\d.,]/g, ''))}
            />
            <Button onClick={handleSaveEditAcao}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Relatórios */}
      <Dialog open={relatoriosOpen} onOpenChange={setRelatoriosOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Relatórios</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Em breve você poderá ver relatórios sobre chamados e máquinas aqui.</p>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function TecnicoRow({ profile }: { profile: Profile }) {
  return (
    <div className="flex gap-2 items-center w-full min-w-0">
      {profile.foto_url ? (
        <img src={profile.foto_url} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="text-sm flex-1 min-w-0">
        <p className="font-medium break-words leading-tight">{profile.nome} {profile.sobrenome}</p>
        <p className="text-muted-foreground text-xs break-all">@{profile.username}</p>
        <p className="text-muted-foreground text-xs break-all">{formatPhone(profile.telefone)}</p>
      </div>
    </div>
  );
}
