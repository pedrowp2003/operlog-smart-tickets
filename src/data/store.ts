import { User, Maquina, Chamado } from '@/types';

function getItem<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Users
export function getUsers(): User[] { return getItem<User>('operlog_users'); }
export function getUserById(id: string): User | undefined { return getUsers().find(u => u.id === id); }
export function getUserByUsername(username: string): User | undefined { return getUsers().find(u => u.username === username); }
export function addUser(user: User) { const users = getUsers(); users.push(user); setItem('operlog_users', users); }
export function updateUser(user: User) { const users = getUsers().map(u => u.id === user.id ? user : u); setItem('operlog_users', users); }
export function deleteUser(id: string) { setItem('operlog_users', getUsers().filter(u => u.id !== id)); }

// Maquinas
export function getMaquinas(): Maquina[] { return getItem<Maquina>('operlog_maquinas'); }
export function getMaquinaById(id: string): Maquina | undefined { return getMaquinas().find(m => m.id === id); }
export function addMaquina(maquina: Maquina) { const list = getMaquinas(); list.push(maquina); setItem('operlog_maquinas', list); }
export function updateMaquina(maquina: Maquina) { setItem('operlog_maquinas', getMaquinas().map(m => m.id === maquina.id ? maquina : m)); }
export function deleteMaquina(id: string) { setItem('operlog_maquinas', getMaquinas().filter(m => m.id !== id)); }

// Chamados
export function getChamados(): Chamado[] { return getItem<Chamado>('operlog_chamados'); }
export function getChamadoById(id: string): Chamado | undefined { return getChamados().find(c => c.id === id); }
export function addChamado(chamado: Chamado) { const list = getChamados(); list.push(chamado); setItem('operlog_chamados', list); }
export function updateChamado(chamado: Chamado) { setItem('operlog_chamados', getChamados().map(c => c.id === chamado.id ? chamado : c)); }
export function deleteChamado(id: string) { setItem('operlog_chamados', getChamados().filter(c => c.id !== id)); }

// Generate chamado number
export function generateChamadoNumero(): string {
  const chamados = getChamados();
  const num = chamados.length + 1;
  return `CH-${String(num).padStart(5, '0')}`;
}

// Get technicians
export function getTecnicos(): User[] { return getUsers().filter(u => u.role === 'tecnico'); }
