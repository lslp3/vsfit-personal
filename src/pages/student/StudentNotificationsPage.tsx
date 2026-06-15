import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Apple,
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Dumbbell,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';

type NotificationItem = {
  id: string;
  source: 'database' | 'smart';
  type: 'message' | 'workout' | 'nutrition' | 'progress' | 'system';
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  raw?: any;
};

function getStudentName(student: any) {
  return student?.name || student?.full_name || student?.email || 'Aluno';
}

function getFirstName(student: any) {
  const name = getStudentName(student);
  const first = String(name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function getCreatedAt(item: any) {
  return (
    item?.created_at ||
    item?.createdAt ||
    item?.updated_at ||
    item?.updatedAt ||
    item?.date ||
    new Date().toISOString()
  );
}

function isReadNotification(item: any) {
  if (typeof item?.read === 'boolean') return item.read;
  if (typeof item?.is_read === 'boolean') return item.is_read;
  if (typeof item?.seen === 'boolean') return item.seen;
  if (typeof item?.viewed === 'boolean') return item.viewed;

  return false;
}

function getNotificationTitle(item: any) {
  return (
    item?.title ||
    item?.titulo ||
    item?.name ||
    item?.subject ||
    'Notificação'
  );
}

function getNotificationMessage(item: any) {
  return (
    item?.message ||
    item?.mensagem ||
    item?.description ||
    item?.body ||
    item?.content ||
    'Você tem uma nova atualização.'
  );
}

function getNotificationType(item: any): NotificationItem['type'] {
  const value = String(item?.type || item?.category || '').toLowerCase();

  if (value.includes('message') || value.includes('chat') || value.includes('mensagem')) {
    return 'message';
  }

  if (value.includes('workout') || value.includes('treino')) {
    return 'workout';
  }

  if (value.includes('nutrition') || value.includes('nutri') || value.includes('alimentar')) {
    return 'nutrition';
  }

  if (value.includes('progress') || value.includes('progresso')) {
    return 'progress';
  }

  return 'system';
}

function getActionUrlByType(type: NotificationItem['type']) {
  if (type === 'message') return '/student/chat';
  if (type === 'workout') return '/student/workouts';
  if (type === 'nutrition') return '/student/nutrition';
  if (type === 'progress') return '/student/progress';

  return '/student/home';
}

function getWorkoutName(workout: any) {
  return workout?.name || workout?.title || workout?.plan_name || 'Treino personalizado';
}

function getNutritionTitle(plan: any) {
  return plan?.name || plan?.title || plan?.objective || 'Plano alimentar';
}

function isPublishedWorkout(workout: any) {
  const status = String(workout?.status || '').toLowerCase();

  return status !== 'draft' && status !== 'rascunho' && status !== 'archived';
}

function getTimeLabel(value?: string | null) {
  if (!value) return 'agora';

  try {
    return timeAgo(value);
  } catch {
    return 'agora';
  }
}

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return bTime - aTime;
  });
}

function uniqueNotifications(items: NotificationItem[]) {
  const map = new Map<string, NotificationItem>();

  items.forEach((item) => {
    const key = `${item.source}-${item.id}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  if (type === 'message') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
        <MessageCircle className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'workout') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/20 bg-[#ff2a32]/10 text-[#ff2a32]">
        <Dumbbell className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'nutrition') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
        <Apple className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'progress') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
        <Trophy className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-zinc-300">
      <Bell className="h-6 w-6" />
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-[#ff2a32]">
        {icon}
      </div>

      <p className="text-lg font-black text-white">{value}</p>

      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>
    </div>
  );
}

export function StudentNotificationsPage() {
  const navigate = useNavigate();

  const [student, setStudent] = useState<any | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return items.filter((item) => !item.read).length;
  }, [items]);

  const smartCount = useMemo(() => {
    return items.filter((item) => item.source === 'smart').length;
  }, [items]);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/student/home');
  }

  async function loadDatabaseNotifications(studentId: string, trainerId?: string | null) {
    const results: any[] = [];

    const queries = [
      () =>
        supabase
          .from('notifications')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50),

      () =>
        supabase
          .from('notifications')
          .select('*')
          .eq('studentid', studentId)
          .order('created_at', { ascending: false })
          .limit(50),

      () =>
        supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50),
    ];

    if (trainerId) {
      queries.push(() =>
        supabase
          .from('notifications')
          .select('*')
          .eq('trainer_id', trainerId)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50)
      );
    }

    for (const runQuery of queries) {
      try {
        const { data, error: queryError } = await runQuery();

        if (queryError) {
          console.warn('[StudentNotificationsPage] notifications query warning:', queryError);
          continue;
        }

        if (Array.isArray(data)) {
          results.push(...data);
        }
      } catch (queryError) {
        console.warn('[StudentNotificationsPage] notifications query exception:', queryError);
      }
    }

    return results;
  }

  async function loadSmartNotifications(studentData: any) {
    const studentId = studentData.id;
    const trainerId = studentData.trainer_id || null;

    const [
      messagesResponse,
      workoutsResponse,
      nutritionResponse,
      logsResponse,
    ] = await Promise.allSettled([
      trainerId
        ? supabase
            .from('messages')
            .select('*')
            .eq('trainer_id', trainerId)
            .eq('student_id', studentId)
            .eq('sender_role', 'personal')
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      workoutService.getWorkoutPlansByStudent(studentId),

      supabase
        .from('nutrition_plans')
        .select('*')
        .or(`student_id.eq.${studentId},studentid.eq.${studentId}`)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('workout_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const smartItems: NotificationItem[] = [];

    const messages =
      messagesResponse.status === 'fulfilled' && Array.isArray(messagesResponse.value?.data)
        ? messagesResponse.value.data
        : [];

    messages.forEach((message) => {
      smartItems.push({
        id: `message-${message.id}`,
        source: 'smart',
        type: 'message',
        title: 'Nova mensagem do personal',
        description: message.content || 'Seu personal enviou uma nova mensagem.',
        createdAt: getCreatedAt(message),
        read: Boolean(message.read),
        actionUrl: '/student/chat',
        raw: message,
      });
    });

    const workouts =
      workoutsResponse.status === 'fulfilled' && Array.isArray(workoutsResponse.value)
        ? workoutsResponse.value.filter(isPublishedWorkout)
        : [];

    const latestWorkouts = [...workouts]
      .sort((a, b) => {
        const aTime = new Date(getCreatedAt(a)).getTime();
        const bTime = new Date(getCreatedAt(b)).getTime();
        return bTime - aTime;
      })
      .slice(0, 3);

    latestWorkouts.forEach((workout) => {
      smartItems.push({
        id: `workout-${workout.id}`,
        source: 'smart',
        type: 'workout',
        title: 'Treino disponível',
        description: getWorkoutName(workout),
        createdAt: getCreatedAt(workout),
        read: true,
        actionUrl: workout?.id
          ? `/student/workout-detail/${workout.id}`
          : '/student/workouts',
        raw: workout,
      });
    });

    const nutritionPlans =
      nutritionResponse.status === 'fulfilled' && Array.isArray(nutritionResponse.value?.data)
        ? nutritionResponse.value.data
        : [];

    nutritionPlans.forEach((plan) => {
      smartItems.push({
        id: `nutrition-${plan.id}`,
        source: 'smart',
        type: 'nutrition',
        title: 'Plano alimentar publicado',
        description: getNutritionTitle(plan),
        createdAt: getCreatedAt(plan),
        read: true,
        actionUrl: '/student/nutrition',
        raw: plan,
      });
    });

    const logs =
      logsResponse.status === 'fulfilled' && Array.isArray(logsResponse.value?.data)
        ? logsResponse.value.data
        : [];

    logs.forEach((log) => {
      smartItems.push({
        id: `progress-${log.id}`,
        source: 'smart',
        type: 'progress',
        title: 'Treino concluído',
        description: 'Parabéns! Seu progresso foi registrado.',
        createdAt: getCreatedAt(log),
        read: true,
        actionUrl: '/student/progress',
        raw: log,
      });
    });

    return smartItems;
  }

  async function loadNotifications() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada. Faça login novamente.');
        return;
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      setStudent(studentData);

      const [databaseRows, smartRows] = await Promise.all([
        loadDatabaseNotifications(studentData.id, studentData.trainer_id || null),
        loadSmartNotifications(studentData),
      ]);

      const databaseItems: NotificationItem[] = databaseRows.map((row) => {
        const type = getNotificationType(row);

        return {
          id: String(row.id),
          source: 'database',
          type,
          title: getNotificationTitle(row),
          description: getNotificationMessage(row),
          createdAt: getCreatedAt(row),
          read: isReadNotification(row),
          actionUrl: row?.action_url || row?.url || getActionUrlByType(type),
          raw: row,
        };
      });

      const allItems = sortNotifications(uniqueNotifications([...databaseItems, ...smartRows]));

      setItems(allItems);
    } catch (loadError: any) {
      console.error('[StudentNotificationsPage] load error:', loadError);
      setError(loadError?.message || 'Erro ao carregar notificações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications();
  }

  async function markOneAsRead(item: NotificationItem) {
    if (item.read) {
      if (item.actionUrl) navigate(item.actionUrl);
      return;
    }

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id && current.source === item.source
          ? { ...current, read: true }
          : current
      )
    );

    if (item.source === 'database') {
      try {
        const { error: readError } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', item.id);

        if (readError) {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', item.id);
        }
      } catch (readError) {
        console.warn('[StudentNotificationsPage] mark one read warning:', readError);
      }
    }

    if (item.source === 'smart' && item.type === 'message' && item.raw?.id) {
      try {
        await supabase.from('messages').update({ read: true }).eq('id', item.raw.id);
      } catch (messageReadError) {
        console.warn('[StudentNotificationsPage] mark message read warning:', messageReadError);
      }
    }

    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  }

  async function markAllAsRead() {
    if (!student?.id || markingAll) return;

    setMarkingAll(true);

    const databaseIds = items
      .filter((item) => item.source === 'database' && !item.read)
      .map((item) => item.id);

    const messageIds = items
      .filter((item) => item.source === 'smart' && item.type === 'message' && !item.read)
      .map((item) => item.raw?.id)
      .filter(Boolean);

    setItems((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      if (databaseIds.length > 0) {
        const { error: readError } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', databaseIds);

        if (readError) {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', databaseIds);
        }
      }

      if (messageIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', messageIds);
      }
    } catch (markError) {
      console.warn('[StudentNotificationsPage] mark all warning:', markError);
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando notificações...</p>
            <p className="mt-1 text-xs text-zinc-500">
              Buscando atualizações do seu treino.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Erro nas notificações</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">{error}</p>

          <button
            type="button"
            onClick={loadNotifications}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                  Central
                </p>

                <h1 className="mt-1 truncate text-[28px] font-black uppercase italic tracking-[-0.06em] text-white">
                  Notificações
                </h1>

                <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                  {student ? `${getFirstName(student)}, veja suas atualizações.` : 'Suas atualizações.'}
                </p>
              </div>

              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32]">
                <BellRing className="h-7 w-7" />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2a32] px-1.5 text-[10px] font-black text-white ring-4 ring-[#050505]">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SmallStat
                icon={<Bell className="h-4 w-4" />}
                label="Total"
                value={items.length}
              />

              <SmallStat
                icon={<BellRing className="h-4 w-4" />}
                label="Não lidas"
                value={unreadCount}
              />

              <SmallStat
                icon={<Sparkles className="h-4 w-4" />}
                label="Sistema"
                value={smartCount}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black uppercase text-white active:scale-95 disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Atualizar
              </button>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || markingAll}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] text-xs font-black uppercase text-white shadow-[0_18px_45px_rgba(255,42,48,0.28)] active:scale-95 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Marcar lidas
              </button>
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] text-zinc-600">
              <Bell className="h-10 w-10" />
            </div>

            <h2 className="mt-5 text-xl font-black text-white">Tudo em dia</h2>

            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Você ainda não tem notificações. Quando tiver treino, mensagem ou plano alimentar novo,
              aparecerá aqui.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {items.map((item) => (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                onClick={() => markOneAsRead(item)}
                className={cn(
                  'w-full rounded-[28px] border p-4 text-left transition-all active:scale-[0.98]',
                  item.read
                    ? 'border-white/10 bg-white/[0.035]'
                    : 'border-[#ff2a32]/25 bg-[#ff2a32]/10 shadow-[0_18px_60px_rgba(255,42,48,0.12)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <NotificationIcon type={item.type} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-sm font-black',
                            item.read ? 'text-white' : 'text-[#ffdddd]'
                          )}
                        >
                          {item.title}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {item.description}
                        </p>
                      </div>

                      {!item.read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff2a32]" />
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        {getTimeLabel(item.createdAt)}
                      </span>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                          item.read
                            ? 'bg-white/[0.04] text-zinc-500'
                            : 'bg-[#ff2a32] text-white'
                        )}
                      >
                        {item.read ? (
                          <>
                            <Check className="h-3 w-3" />
                            Lida
                          </>
                        ) : (
                          <>
                            <BellRing className="h-3 w-3" />
                            Nova
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-zinc-700" />
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default StudentNotificationsPage;