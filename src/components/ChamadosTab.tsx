import { useState, useEffect } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { StatusChamado, CategoriaChamado, CATEGORIAS, STATUS_LIST, getStatusColor, getStatusBgColor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Wrench, User, ClipboardList } from 'lucide-react';

type Chamado = Tables<'chamados'>;
type Maquina = Tables<'maquinas'>;

const MAX_DESC = 500;

export function ChamadosTab() {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailChamado, setDetailChamado] = useState<Chamado | null>(null);
  const [showTecnicoInfo, setShowTecnicoInfo] = useState(false);
  const [meusChamados, setMeusChamados] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [situacao, setSituacao] = useState<'Parada' | 'Operando com restrições'>('Parada');

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaChamado>('Manutenção corretiva');
  const [status, setStatus] = useState<StatusChamado>('Aberto');
  const [acoes, setAcoes] = useState<{ id: string; descricao: string; created_at: string }[]>([]);
  const [novaAcao, setNovaAcao] = useState('');
  const MAX_ACAO = 300;

  const fetchData = async () => {
    const [cRes, mRes, pRes] = await Promise.all([
      supabase.from('chamados').select('*').order('created_at', { ascending: false }),
      supabase.from('maquinas').select('*'),
      supabase.from('profiles').select('*').eq('role', 'tecnico'),
    ]);
    if (cRes.data) setChamados(cRes.data);
    if (mRes.data) setMaquinas(mRes.data);
    if (pRes.data) setProfiles(pRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchAcoes = async (chamadoId: string) => {
    const { data } = await supabase.from('chamado_acoes').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: false });
    if (data) setAcoes(data);
  };

  const handleAddAcao = async () => {
    if (!detailChamado || !novaAcao.trim()) return;
    await supabase.from('chamado_acoes').insert({
      chamado_id: detailChamado.id,
      tecnico_id: user!.id,
      descricao: novaAcao.trim().toUpperCase(),
    });
    setNovaAcao('');
    fetchAcoes(detailChamado.id);
  };

  useEffect(() => {
    if (detailChamado) fetchAcoes(detailChamado.id);
    else setAcoes([]);
  }, [detailChamado?.id]);

  if (!user) return null;

  const canCreate = user.role !== 'tecnico';
  const canDelete = user.role === 'gerente';

  const getMaquina = (id: string) => maquinas.find(m => m.id === id);
  const getTecnico = (id: string) => profiles.find(p => p.id === id);

  const availableMaquinas = maquinas.filter((m) => {
    if (user.role === 'gerente') return true;
    if (user.role === 'coordenador') return m.unidade === user.unidade;
    if (user.role === 'supervisor') return m.unidade === user.unidade && m.armazem === user.armazem;
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
      return maq && maq.unidade === user.unidade && maq.armazem === user.armazem;
    });
  }
  if (user.role === 'tecnico' && meusChamados) {
    filteredChamados = filteredChamados.filter(c => c.tecnico_id === user.id);
  }

  const handleCreate = async () => {
    if (!descricao.trim() || !maquinaId) return;
    await supabase.from('chamados').insert({
      numero: 'TEMP',
      descricao: descricao.trim().toUpperCase(),
      maquina_id: maquinaId,
      situacao_maquina: situacao,
      criado_por: user.id,
    });
    setCreateOpen(false);
    setDescricao('');
    setMaquinaId('');
    fetchData();
  };

  const handleAccept = async () => {
    if (!detailChamado) return;
    const { data } = await supabase.from('chamados').update({
      tecnico_id: user.id,
      categoria,
      status,
    }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    setAcceptOpen(false);
    fetchData();
  };

  const handleStatusChange = async (newStatus: StatusChamado) => {
    if (!detailChamado || detailChamado.tecnico_id !== user.id) return;
    const { data } = await supabase.from('chamados').update({ status: newStatus }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleCategoriaChange = async (newCat: CategoriaChamado) => {
    if (!detailChamado || detailChamado.tecnico_id !== user.id) return;
    const { data } = await supabase.from('chamados').update({ categoria: newCat }).eq('id', detailChamado.id).select().single();
    if (data) setDetailChamado(data);
    fetchData();
  };

  const handleDeleteChamado = async (id: string) => {
    await supabase.from('chamados').delete().eq('id', id);
    setDetailChamado(null);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">Chamados</h2>
        <div className="flex gap-2">
          {user.role === 'tecnico' && (
            <Button variant={meusChamados ? 'default' : 'outline'} size="sm" onClick={() => setMeusChamados(!meusChamados)}>
              Meus Chamados
            </Button>
          )}
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

      {/* Create Dialog */}
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
                    <SelectItem key={m.id} value={m.id}>{m.tipo} — {m.frota} ({m.unidade}/{m.armazem})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleCreate} disabled={!descricao.trim() || !maquinaId}>Criar Chamado</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailChamado} onOpenChange={() => { setDetailChamado(null); setShowTecnicoInfo(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {detailChamado && (() => {
            const maquina = getMaquina(detailChamado.maquina_id);
            const tecnico = detailChamado.tecnico_id ? getTecnico(detailChamado.tecnico_id) : null;
            return (
              <>
                <DialogHeader><DialogTitle>Chamado {detailChamado.numero}</DialogTitle></DialogHeader>
                {maquina?.foto_url && <img src={maquina.foto_url} alt="" className="w-full rounded-lg object-contain max-h-64" />}
                <div className="space-y-2 text-sm">
                  {maquina && (
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-muted-foreground">Tipo:</span><span>{maquina.tipo}</span>
                      <span className="text-muted-foreground">Frota:</span><span>{maquina.frota}</span>
                      <span className="text-muted-foreground">Marca:</span><span>{maquina.marca}</span>
                      <span className="text-muted-foreground">Modelo:</span><span>{maquina.modelo}</span>
                      <span className="text-muted-foreground">Unidade:</span><span>{maquina.unidade}</span>
                      <span className="text-muted-foreground">Armazém:</span><span>{maquina.armazem}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground">Situação: <span className="text-foreground">{detailChamado.situacao_maquina}</span></p>
                    <p className="text-muted-foreground">Descrição:</p>
                    <p>{detailChamado.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    {detailChamado.tecnico_id === user?.id ? (
                      <Select value={detailChamado.status} onValueChange={(v) => handleStatusChange(v as StatusChamado)}>
                        <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`${getStatusColor(detailChamado.status as StatusChamado)} ${getStatusBgColor(detailChamado.status as StatusChamado)} border-0`}>
                        {detailChamado.status}
                      </Badge>
                    )}
                  </div>
                  {detailChamado.categoria && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Categoria:</span>
                      {detailChamado.tecnico_id === user?.id ? (
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
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowTecnicoInfo(!showTecnicoInfo)}>
                    <User className="w-4 h-4 mr-1" /> Dados do Chamado
                  </Button>
                  {user?.role === 'tecnico' && !detailChamado.tecnico_id && (
                    <Button size="sm" onClick={() => setAcceptOpen(true)}>Aceitar Chamado</Button>
                  )}
                </div>

                {showTecnicoInfo && (
                  <div className="border border-border rounded-lg p-3 mt-2 space-y-3">
                    {tecnico ? (
                      <div className="flex gap-3 items-center">
                        {tecnico.foto_url ? (
                          <img src={tecnico.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-sm">
                          <p className="font-medium">{tecnico.nome} {tecnico.sobrenome}</p>
                          <p className="text-muted-foreground">@{tecnico.username}</p>
                          <p className="text-muted-foreground">{tecnico.telefone}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum técnico atribuído</p>
                    )}

                    {/* Ações do chamado */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm font-medium flex items-center gap-1 mb-2">
                        <ClipboardList className="w-4 h-4" /> Ações realizadas
                      </p>
                      {detailChamado.tecnico_id === user?.id && (
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={novaAcao}
                            onChange={(e) => setNovaAcao(e.target.value.toUpperCase().slice(0, MAX_ACAO))}
                            placeholder="DESCREVA A AÇÃO..."
                            className="text-xs"
                            maxLength={MAX_ACAO}
                            style={{ textTransform: 'uppercase' }}
                          />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{novaAcao.length}/{MAX_ACAO}</span>
                          <Button size="sm" onClick={handleAddAcao} disabled={!novaAcao.trim()}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {acoes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma ação registrada</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {acoes.map((acao) => {
                            const d = new Date(acao.created_at);
                            const dataFormatada = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            return (
                              <div key={acao.id} className="bg-muted rounded p-2">
                                <p className="text-xs">{acao.descricao}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{dataFormatada}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Accept Dialog */}
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
            <div>
              <Label>Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusChamado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAccept}>Aceitar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
