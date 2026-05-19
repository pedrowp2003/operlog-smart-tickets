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
  const isTecnico = user?.role === 'tecnico';

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
        const [ch, mq, fo, pf] = await Promise.all([
          supabase.from('chamados')
            .select('id,numero,descricao,status,categoria,codigo_erro')
            .or(`numero.ilike.${like},descricao.ilike.${like},categoria.ilike.${like},codigo_erro.ilike.${like}`)
            .limit(15),
          supabase.from('maquinas')
            .select('id,tipo,marca,modelo,frota')
            .or(`tipo.ilike.${like},marca.ilike.${like},modelo.ilike.${like},frota.ilike.${like}`)
            .limit(15),
          supabase.from('fornecedores')
            .select('id,nome,natureza')
            .or(`nome.ilike.${like},natureza.ilike.${like}`)
            .limit(15),
          // técnicos (filtrados conforme acesso)
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
          const { data: chs } = await supabase
            .from('chamados')
            .select('id,numero,descricao')
            .or(`tecnico_id.eq.${p.id},tecnico2_id.eq.${p.id}`)
            .limit(5);
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
                  <li key={c.id} className="rounded border border-border p-2 text-sm break-words">
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
                  <li key={m.id} className="rounded border border-border p-2 text-sm break-words">
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
                  <li key={f.id} className="rounded border border-border p-2 text-sm break-words">
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
                    <div className="font-medium flex items-center gap-1.5">
                      {p.role === 'tecnico' && <Hammer className="w-3.5 h-3.5 text-primary" />}
                      {(p.nome || '') + ' ' + (p.sobrenome || '')} <span className="text-xs text-muted-foreground">@{p.username}</span>
                    </div>
                    {chs.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {chs.map(c => (
                          <li key={c.id} className="text-[11px] text-muted-foreground">
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