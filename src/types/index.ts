export type UserRole = 'gerente' | 'coordenador' | 'supervisor' | 'tecnico' | 'analista';

export type SituacaoMaquina = 'Parada' | 'Operando com restrições';

export type StatusChamado = 'Aberto' | 'Agendado' | 'Em andamento' | 'Aguardando mão de obra' | 'Aguardando peças' | 'Concluído';

export type CategoriaChamado =
  | 'Manutenção corretiva'
  | 'Manutenção preditiva'
  | 'Manutenção preventiva'
  | 'Dano operacional'
  | 'Diagnóstico'
  | 'Revitalização';

export const UNIDADES = ['Polo Saúde', 'Pátio'] as const;
export const ARMAZENS = ['Armazém 1', 'Armazém 2'] as const;
export const AREAS = ['Armazém 1', 'Armazém 2', 'Polo Saúde', 'Pátio'] as const;
export const TIPOS_MAQUINA = ['Stacker', 'Meclift', 'Caminhão', 'Empilhadeira elétrica'] as const;
export const FROTAS = ['EP-03', 'EP-17', 'EP-39', 'EP-387'] as const;
export const MARCAS = ['Yale', 'Still', 'Hyster', 'Linde'] as const;
export const MODELOS = ['GTP050', 'H55XM', 'R17', 'R1.6H'] as const;

export const CATEGORIAS: CategoriaChamado[] = [
  'Manutenção corretiva',
  'Manutenção preditiva',
  'Manutenção preventiva',
  'Dano operacional',
  'Diagnóstico',
  'Revitalização',
];

export const STATUS_LIST: StatusChamado[] = [
  'Aberto',
  'Agendado',
  'Em andamento',
  'Aguardando mão de obra',
  'Aguardando peças',
  'Concluído',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  gerente: 'Gerente',
  coordenador: 'Coordenador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico de Manutenção',
  analista: 'Analista de Manutenção',
};

export function getStatusColor(status: StatusChamado): string {
  switch (status) {
    case 'Aberto': return 'status-open';
    case 'Agendado': return 'status-scheduled';
    case 'Em andamento': return 'status-progress';
    case 'Aguardando mão de obra': return 'status-waiting';
    case 'Aguardando peças': return 'status-waiting';
    case 'Concluído': return 'status-done';
    default: return '';
  }
}

export function getStatusBgColor(status: StatusChamado): string {
  switch (status) {
    case 'Aberto': return 'bg-status-open';
    case 'Agendado': return 'bg-status-scheduled';
    case 'Em andamento': return 'bg-status-progress';
    case 'Aguardando mão de obra': return 'bg-status-waiting';
    case 'Aguardando peças': return 'bg-status-waiting';
    case 'Concluído': return 'bg-status-done';
    default: return '';
  }
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
