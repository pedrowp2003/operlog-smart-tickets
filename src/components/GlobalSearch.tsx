import { useEffect, useState } from 'react';
import { Search, ClipboardList, Wrench, Package, Users, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Chamado = { id: string; numero: string; descricao: string; status: string; categoria: string | null; codigo_erro: string | null };
type Maquina = { id: string; tipo: string; marca: string; modelo: string; frota: string };
type Fornecedor = { id: string; nome: string; natureza: string };
type Profile = { id: string; nome: string | null; sobrenome: string | null; username: string; role: string };
type TecnicoChamado = { profile: Profile; chamados: { id: string; numero: string; descricao: string }[] };

export function GlobalSearch() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoChamado[]>([]);

  const isAnalista = user?.role === 'analista';
  const isCoordenador = user?.role === 'coordenador';
  const isSupervisor = user?.role === 'supervisor';

  useEffect(() => {
    if (!open) { setQ(''); setChamados([]); setMaquinas([]); setFornecedores([]); setTecnicos([]); }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setChamados([]); setMaquinas([]); setFornecedores([]); setTecnicos([]); return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const like = `%${term}%`;
      try {
        // Máquinas com filtro de unidade/armazém para coord/supervisor
        let mqQuery = supabase.from('maquinas')
          .select('id,tipo,marca,modelo,frota,unidade,armazem')
          .or(`tipo.ilike.${like},marca.ilike.${like},modelo.ilike.${like},frota.ilike.${like}`)
          .limit(15);
        if (isCoordenador && user?.unidade) mqQuery = mqQuery.eq('unidade', user.unidade);
        if (isSupervisor && user?.armazem) mqQuery = mqQuery.eq('armazem', user.armazem);

        // IDs de máquinas visíveis (para restringir chamados de coord/supervisor)
        let allowedMaquinaIds: string[] | null = null;
        if (isCoordenador || isSupervisor) {
          let scopeQ = supabase.from('maquinas').select('id');
          if (isCoordenador && user?.unidade) scopeQ = scopeQ.eq('unidade', user.unidade);
          if (isSupervisor && user?.armazem) scopeQ = scopeQ.eq('armazem', user.armazem);
          const { data: scopeData } = await scopeQ;
          allowedMaquinaIds = (scopeData || []).map((m: any) => m.id);
        }

        let chQuery = supabase.from('chamados')
          .select('id,numero,descricao,status,categoria,codigo_erro,maquina_id')
          .or(`numero.ilike.${like},descricao.ilike.${like},categoria.ilike.${like},codigo_erro.ilike.${like}`)
          .limit(15);
        if (allowedMaquinaIds !== null) {
          if (allowedMaquinaIds.length === 0) {
            chQuery = chQuery.eq('maquina_id', '00000000-0000-0000-0000-000000000000');
          } else {
            chQuery = chQuery.in('maquina_id', allowedMaquinaIds);
          }
        }

        const [ch, mq, fo, pf] = await Promise.all([
          chQuery,
          mqQuery,
          supabase.from('fornecedores')
            .select('id,nome,natureza')
            .or(`nome.ilike.${like},natureza.ilike.${like}`)
            .limit(15),
          // perfis: analistas veem todos; demais cargos veem apenas técnicos
          (async () => {
            let query = supabase.from('profiles')
              .select('id,nome,sobrenome,username,role')
              .or(`nome.ilike.${like},sobrenome.ilike.${like},username.ilike.${like}`)
              .limit(15);
            if (!isAnalista) query = query.eq('role', 'tecnico');
            return await query;
          })(),
        ]);

        setChamados((ch.data as Chamado[]) || []);
        setMaquinas((mq.data as Maquina[]) || []);
        setFornecedores((fo.data as Fornecedor[]) || []);

        const profiles = (pf.data as Profile[]) || [];
        // Para cada técnico encontrado, buscar chamados associados (limite respeitando RLS — chamados são visíveis a todos)
        const tecProfiles = profiles.filter(p => p.role === 'tecnico');
        const tecResults: TecnicoChamado[] = [];
        for (const p of tecProfiles) {
          let tq = supabase
            .from('chamados')
            .select('id,numero,descricao')
            .or(`tecnico_id.eq.${p.id},tecnico2_id.eq.${p.id}`)
            .limit(5);
          if (allowedMaquinaIds !== null) {
            if (allowedMaquinaIds.length === 0) {
              tq = tq.eq('maquina_id', '00000000-0000-0000-0000-000000000000');
            } else {
              tq = tq.in('maquina_id', allowedMaquinaIds);
            }
          }
          const { data: chs } = await tq;
          tecResults.push({ profile: p, chamados: (chs as any) || [] });
        }
        setTecnicos(tecResults);

        // Para usuários não-técnicos (visíveis só para analista), mostrar como "perfil"
        if (isAnalista) {
          const others = profiles.filter(p => p.role !== 'tecnico');
          setTecnicos(prev => [...prev, ...others.map(p => ({ profile: p, chamados: [] }))]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, isAnalista]);

  const empty = !loading && q.trim().length >= 2 &&
    chamados.length === 0 && maquinas.length === 0 && fornecedores.length === 0 && tecnicos.length === 0;

  const focus = (kind: 'chamado' | 'maquina' | 'fornecedor' | 'tecnico' | 'usuario', id: string) => {
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('app:focus', { detail: { kind, id } }));
    }, 50);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Pesquisar" className="h-8 w-8">
          <Search className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Pesquisar</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <Input
            autoFocus
            placeholder="Buscar chamados, máquinas, fornecedores, técnicos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 pb-4 space-y-4">
          {q.trim().length < 2 && (
            <p className="text-xs text-muted-foreground">Digite ao menos 2 caracteres.</p>
          )}
          {loading && <p className="text-xs text-muted-foreground">Pesquisando...</p>}
          {empty && <p className="text-xs text-muted-foreground">Nenhum resultado encontrado.</p>}

          {chamados.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <ClipboardList className="w-3.5 h-3.5" /> Chamados ({chamados.length})
              </h3>
              <ul className="space-y-1">
                {chamados.map(c => (
                  <li key={c.id} onClick={() => focus('chamado', c.id)} className="rounded border border-border p-2 text-sm break-words cursor-pointer hover:bg-accent">
                    <div className="font-medium">{c.numero} · {c.status}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</div>
                    {(c.categoria || c.codigo_erro) && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {c.categoria}{c.categoria && c.codigo_erro ? ' · ' : ''}{c.codigo_erro}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {maquinas.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <Wrench className="w-3.5 h-3.5" /> Máquinas ({maquinas.length})
              </h3>
              <ul className="space-y-1">
                {maquinas.map(m => (
                  <li key={m.id} onClick={() => focus('maquina', m.id)} className="rounded border border-border p-2 text-sm break-words cursor-pointer hover:bg-accent">
                    <div className="font-medium">{m.tipo} · {m.frota}</div>
                    <div className="text-xs text-muted-foreground">{m.marca} {m.modelo}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isTecnico && fornecedores.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <Package className="w-3.5 h-3.5" /> Fornecedores ({fornecedores.length})
              </h3>
              <ul className="space-y-1">
                {fornecedores.map(f => (
                  <li key={f.id} onClick={() => focus('fornecedor', f.id)} className="rounded border border-border p-2 text-sm break-words cursor-pointer hover:bg-accent">
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">{f.natureza}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tecnicos.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> {isAnalista ? 'Usuários' : 'Técnicos'} ({tecnicos.length})
              </h3>
              <ul className="space-y-1">
                {tecnicos.map(({ profile: p, chamados: chs }) => (
                  <li key={p.id} className="rounded border border-border p-2 text-sm break-words">
                    <div
                      onClick={() => focus(p.role === 'tecnico' && !isAnalista ? 'tecnico' : 'usuario', p.id)}
                      className="font-medium flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      {p.role === 'tecnico' && <Hammer className="w-3.5 h-3.5 text-primary" />}
                      {(p.nome || '') + ' ' + (p.sobrenome || '')} <span className="text-xs text-muted-foreground">@{p.username}</span>
                    </div>
                    {chs.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {chs.map(c => (
                          <li key={c.id} onClick={() => focus('chamado', c.id)} className="text-[11px] text-muted-foreground cursor-pointer hover:underline">
                            <span className="font-medium">{c.numero}</span> — {c.descricao}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}