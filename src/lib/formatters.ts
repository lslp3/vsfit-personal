export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('pt-BR');
}

export function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d atrás`;
  return formatDate(date);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-green-400',
    inactive: 'text-gray-500',
    paused: 'text-yellow-400',
    pending: 'text-yellow-400',
    paid: 'text-green-400',
    overdue: 'text-red-400',
    cancelled: 'text-gray-500',
    draft: 'text-gray-500',
    published: 'text-green-400',
    archived: 'text-gray-500',
    approved: 'text-green-400',
    rejected: 'text-red-400',
    not_submitted: 'text-gray-500',
    no_access: 'text-gray-500',
    invited: 'text-blue-400',
    blocked: 'text-red-400',
  };
  return map[status] || 'text-vs-muted';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    paused: 'Pausado',
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
    cancelled: 'Cancelado',
    draft: 'Rascunho',
    published: 'Publicado',
    archived: 'Arquivado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    not_submitted: 'Não enviado',
    no_access: 'Sem acesso',
    invited: 'Convidado',
    blocked: 'Bloqueado',
  };
  return map[status] || status;
}
