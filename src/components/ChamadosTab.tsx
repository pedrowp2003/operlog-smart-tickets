import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getChamados, getMaquinas, getMaquinaById, addChamado, updateChamado, deleteChamado, generateChamadoNumero, getTecnicos, getUserById } from '@/data/store';
import { Chamado, Maquina, StatusChamado, CategoriaChamado, CATEGORIAS, STATUS_LIST, getStatusColor, getStatusBgColor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wrench, User } from 'lucide-react';

const MAX_DESC = 500;

export function ChamadosTab() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailChamado, setDetailChamado] = useState<Chamado | null>(null);
  const [showTecnicoInfo, setShowTecnicoInfo] = useState(false);
  const [meusChamados, setMeusChamados] = useState(false);

  // Create form state
  const [descricao, setDescricao] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [situacao, setSituacao] = useState<'Parada' | 'Operando com restrições'>('Parada');

  // Accept form state
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaChamado>('Manutenção corretiva');
  const [status, setStatus] = useState<StatusChamado>('Aberto');

  const allChamados = useMemo(() => getChamados(), [refresh]);
  const allMaquinas = useMemo(() => getMaquinas(), [refresh]);

  if (!user) return null;

  const canCreate = user.role !== 'tecnico';
  const canDelete = user.role === 'gerente';

  // Filter machines for creation based on role
  const availableMaquinas = allMaquinas.filter((m) => {
    if (user.role === 'gerente') return true;
    if (user.role === 'coordenador') return m.unidade === user.unidade;
    if (user.role === 'supervisor') return m.unidade === user.unidade && m.armazem === user.armazem;
    return false;
  });

  // Filter chamados based on role
  let filteredChamados = allChamados;
  if (user.role === 'tecnico' && meusChamados) {
    filteredChamados = allChamados.filter(c => c.tecnicoId === user.id);
  }

  const handleCreate = () => {
    if (!descricao.trim() || !maquinaId) return;
    const chamado: Chamado = {
      id: crypto.randomUUID(),
      numero: generateChamadoNumero(),
      descricao: descricao.trim().toUpperCase(),
      maquinaId,
      situacaoMaquina: situacao,
      status: 'Aberto',
      criadoPor: user.id,
      criadoEm: new Date().toISOString(),
    };
    addChamado(chamado);
    setCreateOpen(false);
    setDescricao('');
    setMaquinaId('');
    setRefresh(r => r + 1);
  };

  const handleAccept = () => {
    if (!detailChamado) return;
    const updated = { ...detailChamado, tecnicoId: user.id, categoria, status };
    updateChamado(updated);
    setDetailChamado(updated);
    setAcceptOpen(false);
    setRefresh(r => r + 1);
  };

  const handleStatusChange = (newStatus: StatusChamado) => {
    if (!detailChamado || detailChamado.tecnicoId !== user.id) return;
    const updated = { ...detailChamado, status: newStatus };
    updateChamado(updated);
    setDetailChamado(updated);
    setRefresh(r => r + 1);
  };

  const handleCategoriaChange = (newCat: CategoriaChamado) => {
    if (!detailChamado || detailChamado.tecnicoId !== user.id) return;
    const updated = { ...detailChamado, categoria: newCat };
    updateChamado(updated);
    setDetailChamado(updated);
    setRefresh(r => r + 1);
  };

  const handleDeleteChamado = (id: string) => {
    deleteChamado(id);
    setDetailChamado(null);
    setRefresh(r => r + 1);
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
            const maquina = getMaquinaById(chamado.maquinaId);
            return (
              <Card
                key={chamado.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow flex gap-3 items-start"
                onClick={() => setDetailChamado(chamado)}
              >
                {maquina?.foto ? (
                  <img src={maquina.foto} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{chamado.numero}</span>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(chamado.status)} ${getStatusBgColor(chamado.status)} border-0`}>
                      {chamado.status}
                    </Badge>
                  </div>
                  {maquina && (
                    <p className="text-sm font-medium truncate">{maquina.tipo} — {maquina.frota} ({maquina.marca})</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{chamado.descricao}</p>
                  {chamado.categoria && (
                    <span className="text-xs text-muted-foreground">{chamado.categoria}</span>
                  )}
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
        <DialogContent className="max-w-md">
          {detailChamado && (() => {
            const maquina = getMaquinaById(detailChamado.maquinaId);
            const tecnico = detailChamado.tecnicoId ? getUserById(detailChamado.tecnicoId) : null;
            return (
              <>
                <DialogHeader><DialogTitle>Chamado {detailChamado.numero}</DialogTitle></DialogHeader>
                {maquina?.foto && (
                  <img src={maquina.foto} alt="" className="w-full h-48 object-cover rounded-lg" />
                )}
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
                    <p className="text-muted-foreground">Situação: <span className="text-foreground">{detailChamado.situacaoMaquina}</span></p>
                    <p className="text-muted-foreground">Descrição:</p>
                    <p>{detailChamado.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    {detailChamado.tecnicoId === user?.id ? (
                      <Select value={detailChamado.status} onValueChange={(v) => handleStatusChange(v as StatusChamado)}>
                        <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`${getStatusColor(detailChamado.status)} ${getStatusBgColor(detailChamado.status)} border-0`}>
                        {detailChamado.status}
                      </Badge>
                    )}
                  </div>
                  {detailChamado.categoria && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Categoria:</span>
                      {detailChamado.tecnicoId === user?.id ? (
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
                  {user?.role === 'tecnico' && !detailChamado.tecnicoId && (
                    <Button size="sm" onClick={() => setAcceptOpen(true)}>Aceitar Chamado</Button>
                  )}
                </div>

                {showTecnicoInfo && (
                  <div className="border border-border rounded-lg p-3 mt-2">
                    {tecnico ? (
                      <div className="flex gap-3 items-center">
                        {tecnico.foto ? (
                          <img src={tecnico.foto} alt="" className="w-14 h-14 rounded-full object-cover" />
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
