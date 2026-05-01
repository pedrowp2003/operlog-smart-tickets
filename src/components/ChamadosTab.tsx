import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { StatusChamado, CategoriaChamado, CATEGORIAS, STATUS_LIST, getStatusColor, getStatusBgColor, formatPhone } from '@/types';
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
import { Plus, Trash2, Wrench, User, ClipboardList, ChevronUp, ChevronDown, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

type Chamado = Tables<'chamados'>;
type Maquina = Tables<'maquinas'>;
type Acao = Tables<'chamado_acoes'>;
type Fornecedor = Tables<'fornecedores'>;

const MAX_DESC = 500;
const MAX_ACAO = 300;
const MAX_COD_ERRO = 50;

export function ChamadosTab() {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailChamado, setDetailChamado] = useState<Chamado | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [meusChamados, setMeusChamados] = useState(false);

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

  const [prevDataStr, setPrevDataStr] = useState('');
  const [prevHoraStr, setPrevHoraStr] = useState('');

  const fetchData = async () => {
    const [cRes, mRes, pRes, fRes] = await Promise.all([
      supabase.from('chamados').select('*').order('created_at', { ascending: false }),
      supabase.from('maquinas').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('fornecedores').select('*'),
    ]);
    if (cRes.data) setChamados(cRes.data);
    if (mRes.data) setMaquinas(mRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (fRes.data) setFornecedores(fRes.data);
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

  if (!user) return null;

  const isAnalista = user.role === 'analista';
  const isTecnico = user.role === 'tecnico';
  const canCreate = !isTecnico;
  const canDelete = isAnalista;

  const getMaquina = (id: string) => maquinas.find(m => m.id === id);
  const getProfile = (id: string | null) => id ? profiles.find(p => p.id === id) : null;
  const getFornecedor = (id: string | null) => id ? fornecedores.find(f => f.id === id) : null;

  const tecnicos = profiles.filter(p => p.role === 'tecnico');

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
    const updates: Partial<Chamado> = { categoria, status: 'Em andamento' };
    if (!detailChamado.tecnico_id) {
      updates.tecnico_id = user.id;
    } else if (detailChamado.tecnico_id !== user.id && !detailChamado.tecnico2_id) {
      updates.tecnico2_id = user.id;
    } else {
      toast.error('Este chamado já tem dois técnicos');
      return;
    }
    const { data } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    setAcceptOpen(false);
    fetchData();
  };

  const canEditChamado = (c: Chamado) => {
    // Analista só pode alterar quando houver pelo menos um técnico no chamado
    if (isAnalista) return !!(c.tecnico_id || c.tecnico2_id);
    return c.tecnico_id === user.id || c.tecnico2_id === user.id;
  };

  const handleStatusChange = async (newStatus: StatusChamado) => {
    if (!detailChamado || !canEditChamado(detailChamado)) return;
    const updates: Partial<Chamado> = { status: newStatus };
    if (newStatus === 'Aberto') updates.progresso = 0;
    if (newStatus === 'Concluído') updates.progresso = 100;
    const { data } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
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
    const { data } = await supabase.from('chamados').update({ progresso: val }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleDataPrevistaChange = async (iso: string) => {
    if (!detailChamado || !isAnalista) return;
    if (!canEditChamado(detailChamado)) return;
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

  const handleDeleteChamado = async (id: string) => {
    if (!isAnalista) return;
    await supabase.from('chamados').delete().eq('id', id);
    setDetailChamado(null);
    fetchData();
  };

  const handleAssignTecnico = async (slot: 1 | 2, tecnicoId: string | null) => {
    if (!detailChamado || !isAnalista) return;
    const updates: Partial<Chamado> = {};
    if (slot === 1) updates.tecnico_id = tecnicoId;
    if (slot === 2) updates.tecnico2_id = tecnicoId;
    // se está atribuindo 1º técnico e está aberto, vai para Em andamento
    if (slot === 1 && tecnicoId && detailChamado.status === 'Aberto') {
      updates.status = 'Em andamento';
    }
    const { data, error } = await supabase.from('chamados').update(updates).eq('id', detailChamado.id).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setDetailChamado(data);
    fetchData();
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

  // Técnicos disponíveis para atribuição (não estão atrelados a outros chamados não-concluídos)
  const tecnicosLivres = (excluindoSlot?: 1 | 2): Profile[] => {
    const ocupadosIds = new Set<string>();
    chamados.forEach(c => {
      if (c.id === detailChamado?.id) return;
      if (c.status === 'Concluído') return;
      if (c.tecnico_id) ocupadosIds.add(c.tecnico_id);
      if (c.tecnico2_id) ocupadosIds.add(c.tecnico2_id);
    });
    // permitir manter o atual do slot
    const currentId = detailChamado ? (excluindoSlot === 1 ? detailChamado.tecnico_id : detailChamado.tecnico2_id) : null;
    return tecnicos.filter(t => !ocupadosIds.has(t.id) || t.id === currentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">Chamados</h2>
        <div className="flex gap-2">
          <Button variant={meusChamados ? 'default' : 'outline'} size="sm" onClick={() => setMeusChamados(!meusChamados)}>
            Meus Chamados
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Novo Chamado
            </Button>
          )}
        </div>
      </div>

      {filteredChamados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum chamado encontrado</p>
      ) : (
        <div className="grid gap-3">
          {filteredChamados.map((chamado) => {
            const maquina = getMaquina(chamado.maquina_id);
            return (
              <Card key={chamado.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start" onClick={() => setDetailChamado(chamado)}>
                {maquina?.foto_url ? (
                  <img src={maquina.foto_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{chamado.numero}</span>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(chamado.status as StatusChamado)} ${getStatusBgColor(chamado.status as StatusChamado)} border-0`}>
                      {chamado.status}
                    </Badge>
                  </div>
                  {maquina && <p className="text-sm font-medium truncate">{maquina.tipo} — {maquina.frota} ({maquina.marca})</p>}
                  <p className="text-xs text-muted-foreground truncate">{chamado.descricao}</p>
                  {chamado.categoria && <span className="text-xs text-muted-foreground">{chamado.categoria}</span>}
                </div>
                {canDelete && (
                  <Button variant="ghost" size="sm" className="text-destructive flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteChamado(chamado.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
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
      <Dialog open={!!detailChamado} onOpenChange={() => { setDetailChamado(null); setShowInfo(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
            return (
              <>
                <DialogHeader><DialogTitle>Chamado {detailChamado.numero}</DialogTitle></DialogHeader>

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

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Andamento</span>
                    <span className="text-xs font-medium">{progresso}%</span>
                  </div>
                  {isAnalista && editavel && detailChamado.status !== 'Aberto' && detailChamado.status !== 'Concluído' ? (
                    <Slider value={[progresso]} onValueChange={(v) => handleProgressoChange(v[0])} max={100} step={5} />
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
                          onClick={() => setZoomImg(detailChamado.foto_defeito_url!)}
                        />
                      </div>
                    )}
                  </div>

                  {detailChamado.categoria && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Categoria:</span>
                      {editavel ? (
                        <Select value={detailChamado.categoria} onValueChange={(v) => handleCategoriaChange(v as CategoriaChamado)}>
                          <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{detailChamado.categoria}</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border items-center">
                    <span className="text-muted-foreground">Data de Início:</span>
                    <span>{formatDateTime(dataInicio)}</span>
                    <span className="text-muted-foreground">Previsão de Término:</span>
                    {isAnalista && editavel ? (
                      <div className="flex gap-1">
                        <Input
                          value={prevDataStr}
                          onChange={(e) => setPrevDataStr(e.target.value)}
                          onBlur={() => {
                            const iso = combineDateTime(prevDataStr, prevHoraStr || '00:00');
                            if (iso) handleDataPrevistaChange(iso);
                            else if (!prevDataStr && !prevHoraStr) handleDataPrevistaChange('');
                          }}
                          placeholder="DD/MM/AAAA"
                          className="h-7 text-xs"
                          inputMode="numeric"
                        />
                        <Input
                          value={prevHoraStr}
                          onChange={(e) => setPrevHoraStr(e.target.value)}
                          onBlur={() => {
                            const iso = combineDateTime(prevDataStr, prevHoraStr || '00:00');
                            if (iso) handleDataPrevistaChange(iso);
                          }}
                          placeholder="HH:MM"
                          className="h-7 text-xs w-20"
                          inputMode="numeric"
                        />
                      </div>
                    ) : (
                      <span>{dataPrevista ? formatDateTime(dataPrevista) : <span className="text-muted-foreground text-xs">—</span>}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowInfo(!showInfo)}>
                    <User className="w-4 h-4 mr-1" /> Dados do Chamado
                    {showInfo ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronUp className="w-4 h-4 ml-1" />}
                  </Button>
                  {podeAceitar && (
                    <Button size="sm" onClick={() => setAcceptOpen(true)}>Aceitar Chamado</Button>
                  )}
                  {isAnalista && (
                    <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Gerenciar técnicos</Button>
                  )}
                </div>

                {showInfo && (
                  <div className="border border-border rounded-lg p-3 mt-2 space-y-3 overflow-hidden">
                    <p className="text-sm font-medium">Técnicos atribuídos</p>
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

                {showInfo && (
                  <div className="border border-border rounded-lg p-3 mt-2 space-y-3 overflow-hidden">
                    <p className="text-sm font-medium flex items-center gap-1 mb-2">
                      <ClipboardList className="w-4 h-4" /> Ações realizadas
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
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={novoFornId} onValueChange={setNovoFornId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fornecedor (opcional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem fornecedor</SelectItem>
                              {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="Valor R$"
                            value={novoValor}
                            onChange={e => setNovoValor(e.target.value)}
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
                                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                                  {fornecedor.foto_url ? (
                                    <img src={fornecedor.foto_url} alt="" className="w-8 h-8 rounded object-contain bg-background" />
                                  ) : (
                                    <Package className="w-6 h-6 text-muted-foreground" />
                                  )}
                                  <div className="text-[10px] flex-1 min-w-0">
                                    <p className="font-medium break-words">{fornecedor.nome}</p>
                                    <p className="text-muted-foreground">{formatPhone(fornecedor.telefone)}</p>
                                  </div>
                                </div>
                              )}
                              {acao.valor != null && (
                                <p className="text-[11px] font-medium text-primary">R$ {Number(acao.valor).toFixed(2).replace('.', ',')}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground">{dataFormatada}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
            <div>
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaChamado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Ao aceitar, o status irá para "Em andamento" automaticamente.</p>
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
              <div>
                <Label>Técnico principal</Label>
                <div className="flex gap-2">
                  <Select value={detailChamado.tecnico_id || 'none'} onValueChange={(v) => handleAssignTecnico(1, v === 'none' ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {tecnicosLivres(1).map(t => <SelectItem key={t.id} value={t.id}>{t.nome} {t.sobrenome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {detailChamado.tecnico_id && (
                    <Button variant="ghost" size="icon" onClick={() => handleAssignTecnico(1, null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Segundo técnico</Label>
                <div className="flex gap-2">
                  <Select value={detailChamado.tecnico2_id || 'none'} onValueChange={(v) => handleAssignTecnico(2, v === 'none' ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {tecnicosLivres(2).filter(t => t.id !== detailChamado.tecnico_id).map(t => <SelectItem key={t.id} value={t.id}>{t.nome} {t.sobrenome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {detailChamado.tecnico2_id && (
                    <Button variant="ghost" size="icon" onClick={() => handleAssignTecnico(2, null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Apenas técnicos sem chamados ativos aparecem na lista.</p>
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
    </div>
  );
}

function TecnicoRow({ profile }: { profile: Profile }) {
  return (
    <div className="flex gap-3 items-center">
      {profile.foto_url ? (
        <img src={profile.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <User className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="text-sm flex-1 min-w-0">
        <p className="font-medium break-words">{profile.nome} {profile.sobrenome}</p>
        <p className="text-muted-foreground text-xs">@{profile.username}</p>
        <p className="text-muted-foreground text-xs">{profile.telefone}</p>
        {profile.area && <p className="text-xs text-primary">Área: {profile.area}</p>}
      </div>
    </div>
  );
}
