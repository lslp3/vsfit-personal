import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

type NotificationRow = {
  id: string;
  user_id?: string | null;
  title: string;
  message?: string | null;
  type: string;
  read?: boolean | null;
  created_at?: string | null;
};

type NotificationsViewProps = {
  [key: string]: any;
};

function fixTextEncoding(value?: string | null) {
  if (!value) return '';

  return String(value)
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Á')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‚/g, 'Â')
    .replace(/Ãƒ/g, 'Ã')
    .replace(/Ã‰/g, 'É')
    .replace(/ÃŠ/g, 'Ê')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ã•/g, 'Õ')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç');
}

function cleanNotificationMessage(value?: string | null) {
  const text = fixTextEncoding(value || 'Sem descrição.');

  return text
    // Remove Log antigo
    .replace(/\s*Log:\s*[0-9a-f-]{20,}\.?/gi, '')

    // Remove datas ISO antigas completas
    .replace(/\s*Início:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Inicio:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Finalizado:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')

    // Remove qualquer resto de ISO que tenha sobrado
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, '')

    // Corrige resto tipo: min.103Z
    .replace(/min\.\d+Z\.?/gi, 'min.')

    // Limpa espaços e pontuação sobrando
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

function getCurrentCoachEmail() {
  try {
    const direct =
      localStorage.getItem('vsfit_coach_email') ||
      localStorage.getItem('coachEmail') ||
      localStorage.getItem('user_email') ||
      localStorage.getItem('email');

    if (direct) return String(direct).toLowerCase();

    const possibleKeys = [
      'vsfit_user_profile',
      'vsfit_profile',
      'vsfit_session',
      'supabase.auth.token',
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const email =
        parsed?.email ||
        parsed?.user?.email ||
        parsed?.profile?.email ||
        parsed?.currentSession?.user?.email ||
        parsed?.currentUser?.email;

      if (email) return String(email).toLowerCase();
    }
  } catch {
    return '';
  }

  return '';
}

function getCurrentCoachUserIdFromLocalStorage() {
  try {
    const direct =
      localStorage.getItem('vsfit_coach_user_id') ||
      localStorage.getItem('coachUserId') ||
      localStorage.getItem('user_id') ||
      localStorage.getItem('auth_user_id');

    if (direct) return String(direct);

    const possibleKeys = [
      'vsfit_user_profile',
      'vsfit_profile',
      'vsfit_session',
      'supabase.auth.token',
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const id =
        parsed?.id ||
        parsed?.user_id ||
        parsed?.auth_user_id ||
        parsed?.user?.id ||
        parsed?.profile?.id ||
        parsed?.profile?.user_id ||
        parsed?.currentSession?.user?.id ||
        parsed?.currentUser?.id;

      if (id) return String(id);
    }
  } catch {
    return '';
  }

  return '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function getTypeLabel(type?: string | null) {
  const value = String(type || '').toLowerCase();

  const map: Record<string, string> = {
    system: 'Sistema',
    milestone: 'Meta',
    trainer_student_workout_completed: 'Treino concluído',
    trainer_student_plan_expired: 'Plano vencido',
    signup_lead_created: 'Novo cadastro',
    payment: 'Pagamento',
    billing: 'Financeiro',
    cref_submitted: 'CREF',
  };

  return map[value] || type || 'Sistema';
}

function getTypeIcon(type?: string | null) {
  const value = String(type || '').toLowerCase();

  if (value.includes('workout')) return Dumbbell;

  return Bell;
}

function getTypeStyle(type?: string | null) {
  const value = String(type || '').toLowerCase();

  if (value.includes('workout') || value.includes('plan_expired')) {
    return {
      badge: 'border-blue-500/25 bg-blue-500/15 text-blue-300',
      icon: 'border-blue-500/25 bg-blue-500/15 text-blue-300',
      glow: 'from-blue-500/14',
    };
  }

  if (value.includes('signup')) {
    return {
      badge: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
      icon: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
      glow: 'from-emerald-500/14',
    };
  }

  return {
    badge: 'border-[#FF2B2B]/25 bg-[#FF2B2B]/15 text-[#FF4D4D]',
    icon: 'border-[#FF2B2B]/25 bg-[#FF2B2B]/15 text-[#FF4D4D]',
    glow: 'from-[#FF2B2B]/14',
  };
}

function isStudentOnlyNotification(notification: NotificationRow) {
  const type = String(notification.type || '').toLowerCase();
  const title = fixTextEncoding(String(notification.title || '')).toLowerCase();
  const message = fixTextEncoding(String(notification.message || '')).toLowerCase();

  return (
    type.includes('student_workout_assigned') ||
    type.includes('workout_assigned_to_student') ||
    type.includes('student_assigned_workout') ||
    title.includes('novo treino atribuído') ||
    title.includes('novo treino atribuido') ||
    message.includes('seu personal atribuiu o treino')
  );
}

export default function NotificationsView(_props: NotificationsViewProps) {
  const [coachEmail, setCoachEmail] = useState(getCurrentCoachEmail());
  const [coachUserId, setCoachUserId] = useState(getCurrentCoachUserIdFromLocalStorage());
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  async function resolveCoachIdentity() {
    let resolvedUserId = getCurrentCoachUserIdFromLocalStorage();
    let resolvedEmail = getCurrentCoachEmail();

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.warn('[NotificationsView] auth identity error:', error);
      }

      const authUser = data?.user || null;

      if (authUser?.id) {
        resolvedUserId = authUser.id;
        localStorage.setItem('vsfit_coach_user_id', authUser.id);
      }

      if (authUser?.email) {
        resolvedEmail = String(authUser.email).toLowerCase();
        localStorage.setItem('vsfit_coach_email', resolvedEmail);
      }
    } catch (error) {
      console.warn('[NotificationsView] auth identity exception:', error);
    }

    setCoachUserId(resolvedUserId);
    setCoachEmail(resolvedEmail);

    return {
      userId: resolvedUserId,
      email: resolvedEmail,
    };
  }

  async function loadNotifications() {
    setLoading(true);

    try {
      const identity = await resolveCoachIdentity();

      if (!identity.userId) {
        setNotifications([]);
        setLastUpdated(new Date().toLocaleString('pt-BR'));
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', identity.userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[NotificationsView] load error:', error);
        alert('Erro ao carregar notificações reais. Veja o console.');
        return;
      }

      setNotifications(
        ((data || []) as NotificationRow[]).filter((item) => !isStudentOnlyNotification(item))
      );

      setLastUpdated(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      console.error('[NotificationsView] exception:', error);
      alert('Erro inesperado ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const search = query.trim().toLowerCase();

    return notifications.filter((item) => {
      if (isStudentOnlyNotification(item)) return false;

      const message = cleanNotificationMessage(item.message);
      const title = fixTextEncoding(item.title);

      const matchesUnread = !showUnreadOnly || !item.read;

      const matchesSearch =
        !search ||
        title.toLowerCase().includes(search) ||
        message.toLowerCase().includes(search) ||
        String(item.type || '').toLowerCase().includes(search);

      return matchesUnread && matchesSearch;
    });
  }, [notifications, showUnreadOnly, query]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function toggleRead(notification: NotificationRow) {
    try {
      const nextRead = !Boolean(notification.read);

      const { error } = await supabase
        .from('notifications')
        .update({
          read: nextRead,
        })
        .eq('id', notification.id);

      if (error) {
        console.error('[NotificationsView] toggle read error:', error);
        alert('Erro ao atualizar notificação.');
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: nextRead,
              }
            : item
        )
      );
    } catch (error) {
      console.error('[NotificationsView] toggle read exception:', error);
      alert('Erro inesperado ao atualizar notificação.');
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);

    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
        })
        .in('id', unreadIds);

      if (error) {
        console.error('[NotificationsView] mark all error:', error);
        alert('Erro ao marcar todas como lidas.');
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
        }))
      );
    } catch (error) {
      console.error('[NotificationsView] mark all exception:', error);
      alert('Erro inesperado ao marcar todas como lidas.');
    }
  }

  async function deleteNotification(notification: NotificationRow) {
    const confirmed = window.confirm('Deseja excluir esta notificação?');

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      if (error) {
        console.error('[NotificationsView] delete error:', error);
        alert('Erro ao excluir notificação.');
        return;
      }

      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
    } catch (error) {
      console.error('[NotificationsView] delete exception:', error);
      alert('Erro inesperado ao excluir notificação.');
    }
  }

  return (
      <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#050505] text-white lg:bg-transparent">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,43,43,0.13),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,43,43,0.08),transparent_34%)] lg:hidden" />

        <section className="relative z-10 mx-auto w-full max-w-lg overflow-x-hidden px-4 pb-32 pt-5 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-0">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#FF2B2B]">
              Inbox do Sistema
            </p>

            <h1 className="mt-1 flex items-center gap-3 text-[22px] font-black leading-none tracking-tight text-white lg:text-3xl">
              <Bell className="h-8 w-8 text-[#FF2B2B]" />
              Central de Notificações
            </h1>

            <p className="mt-2 text-[13px] font-semibold text-[#909090]">
              Alertas reais do personal {coachEmail || coachUserId || 'logado'}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <button
              type="button"
              onClick={loadNotifications}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#252525] bg-[#151515] px-4 text-[11px] font-black uppercase text-white"
            >
              <RefreshCw className={`h-4 w-4 text-[#FF2B2B] ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              className={`flex h-12 items-center justify-center rounded-2xl border px-4 text-[11px] font-black uppercase ${
                showUnreadOnly
                  ? 'border-[#FF2B2B] bg-[#FF2B2B]/15 text-[#FF4D4D]'
                  : 'border-[#252525] bg-[#151515] text-white'
              }`}
            >
              {showUnreadOnly ? 'Ver todas' : 'Não lidas'}
            </button>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <Bell className="mb-3 h-5 w-5 text-[#FF2B2B]" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Total</p>
            <strong className="mt-1 block text-[20px] font-black text-white">
              {loading ? '...' : notifications.length}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <Clock className="mb-3 h-5 w-5 text-yellow-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Não lidas</p>
            <strong className="mt-1 block text-[20px] font-black text-white">
              {loading ? '...' : unreadCount}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Lidas</p>
            <strong className="mt-1 block text-[20px] font-black text-white">
              {loading ? '...' : notifications.length - unreadCount}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <RefreshCw className="mb-3 h-5 w-5 text-blue-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Atualizado</p>
            <strong className="mt-1 block truncate text-[12px] font-black text-white">
              {lastUpdated || '-'}
            </strong>
          </article>
        </section>

        <section className="mb-5 rounded-[24px] border border-[#242424] bg-[#151515]/95 p-3 lg:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#2A2A2A] bg-[#090909] px-4">
              <Search className="h-4 w-4 shrink-0 text-[#707070]" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar título, mensagem ou tipo..."
                className="min-w-0 flex-1 bg-transparent text-[12px] font-bold text-white outline-none placeholder:text-[#707070]"
              />
            </label>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-[11px] font-black uppercase text-emerald-400 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar todas lidas
            </button>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#242424] bg-[#151515]/95 p-3 lg:p-5">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#1A1A1A] px-4 py-3">
            <span className="text-[11px] font-black uppercase text-white">
              Alertas registrados ({filteredNotifications.length})
            </span>

            <span className="text-[10px] font-black uppercase text-[#808080]">
              {unreadCount === 0 ? 'Tudo lido' : `${unreadCount} nova(s)`}
            </span>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="rounded-2xl border border-[#252525] bg-[#090909] p-6 text-center">
                <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-[#FF2B2B]" />
                <p className="text-[13px] font-black text-white">
                  Carregando notificações...
                </p>
              </div>
            )}

            {!loading && filteredNotifications.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#333333] p-6 text-center">
                <Bell className="mx-auto mb-3 h-9 w-9 text-[#505050]" />

                <p className="text-[13px] font-black text-white">
                  Nenhuma notificação encontrada.
                </p>

                <p className="mt-1 text-[12px] font-bold text-[#808080]">
                  Quando um aluno finalizar treino, o alerta aparecerá aqui.
                </p>
              </div>
            )}

            {!loading &&
              filteredNotifications.map((notification) => {
                const style = getTypeStyle(notification.type);
                const Icon = getTypeIcon(notification.type);
                const title = fixTextEncoding(notification.title);
                const message = cleanNotificationMessage(notification.message);

                return (
                  <article
                    key={notification.id}
                    className={`relative overflow-hidden rounded-[24px] border p-4 shadow-[0_20px_55px_rgba(0,0,0,0.35)] ${
                      notification.read
                        ? 'border-[#252525] bg-[#080808]'
                        : 'border-[#FF2B2B]/35 bg-[#120808]'
                    }`}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.glow} to-transparent`} />

                    <div className="relative flex gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.icon}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${style.badge}`}
                          >
                            {getTypeLabel(notification.type)}
                          </span>

                          <span
                            className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                              notification.read
                                ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400'
                                : 'border-yellow-500/25 bg-yellow-500/15 text-yellow-400'
                            }`}
                          >
                            {notification.read ? 'Lida' : 'Nova'}
                          </span>
                        </div>

                        <h3 className="text-[15px] font-black leading-tight text-white">
                          {title}
                        </h3>

                        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#A5A5A5]">
                          {message}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold text-[#707070]">
                            {formatDateTime(notification.created_at)}
                          </p>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleRead(notification)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10"
                              title={notification.read ? 'Marcar como nova' : 'Marcar como lida'}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteNotification(notification)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-[#FF2B2B]/35 bg-[#FF2B2B]/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-[#FF4D4D]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </section>
    </main>
  );
}