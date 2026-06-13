import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Flame,
  Zap,
  Calendar,
  MessageSquare,
  User,
  BarChart3,
  ChevronRight,
  Clock,
  Target,
  Trophy,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuthStore } from '../../store/authStore';
import { getWorkoutPlansByStudent } from '../../services/workoutService';
import { getWorkoutLogsByStudent } from '../../services/workoutService';
import { getMessages } from '../../services/messageService';
import { getGreeting, cn } from '../../lib/utils';
import { formatTime, timeAgo } from '../../lib/formatters';
import type { WorkoutPlan, WorkoutLog, Message } from '../../types/database';

export function StudentHomePage() {
  const navigate = useNavigate();
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!user || !studentId) return;
    loadData();
  }, [user, studentId]);

  async function loadData() {
    try {
      const [plansData, logsData] = await Promise.all([
        getWorkoutPlansByStudent(studentId!),
        getWorkoutLogsByStudent(studentId!),
      ]);

      const publishedPlans = plansData.filter((p) => p.status === 'published');
      setPlans(publishedPlans);
      setLogs(logsData);

      try {
        const trainerId = storeStudent?.trainer_id || plansData[0]?.trainer_id;
        if (trainerId) {
          const msgs = await getMessages(trainerId, studentId!);
          const studentMsgs = msgs.filter((m) => m.sender_role === 'personal');
          if (studentMsgs.length > 0) {
            setLastMessage(studentMsgs[studentMsgs.length - 1]);
          }
        }
      } catch {
        // messages optional
      }
    } catch (err) {
      console.error('Home load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  const name = storeStudent?.name || user?.email?.split('@')[0] || 'Aluno';

  const todayPlan = plans.length > 0 ? plans[0] : null;

  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(weekStart.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const weeklyLogs = logs.filter((l) => {
    const d = new Date(l.completed_at || l.created_at);
    return d >= monday;
  });

  const totalCompleted = logs.filter((l) => l.status === 'completed').length;

  const streakDays = (() => {
    if (logs.length === 0) return 0;
    const sorted = [...logs]
      .filter((l) => l.status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.created_at).getTime() -
          new Date(a.completed_at || a.created_at).getTime()
      );
    if (sorted.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecent = new Date(
      sorted[0].completed_at || sorted[0].created_at
    );
    mostRecent.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 1) return 0;

    let streak = 0;
    let checkDate = new Date(mostRecent);
    for (const log of sorted) {
      const logDate = new Date(log.completed_at || log.created_at);
      logDate.setHours(0, 0, 0, 0);

      const diffCheck = Math.floor(
        (checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffCheck === 0) {
        if (!streak) streak = 1;
      } else if (diffCheck === 1) {
        streak++;
        checkDate = logDate;
      } else if (diffCheck > 1) {
        break;
      }
    }
    return streak;
  })();

  const totalTimeSpent = logs.reduce(
    (acc, l) => acc + (l.duration_seconds || 0),
    0
  );

  return (
    <div className="page-container space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-vs-muted text-sm font-medium">
          {getGreeting()}
        </p>
        <h1 className="text-2xl font-bold text-white mt-0.5">
          {name}
        </h1>
      </motion.div>

      {todayPlan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-vs-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-vs-primary/15 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-vs-primary" />
                </div>
                <span className="text-xs font-medium text-vs-primary uppercase tracking-wider">
                  Treino de Hoje
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-1">
                {todayPlan.name}
              </h2>

              <div className="flex flex-wrap gap-3 mb-4">
                {todayPlan.objective && (
                  <div className="flex items-center gap-1.5 text-xs text-vs-muted">
                    <Target className="w-3.5 h-3.5" />
                    <span>{todayPlan.objective}</span>
                  </div>
                )}
                {todayPlan.duration_minutes && (
                  <div className="flex items-center gap-1.5 text-xs text-vs-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{todayPlan.duration_minutes} min</span>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() =>
                  navigate(`/student/workout-execution/${todayPlan.id}`)
                }
              >
                <Dumbbell className="w-4 h-4" />
                Iniciar Treino
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-vs-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <Trophy className="w-4 h-4 text-vs-primary" />
            </div>
            <p className="text-xl font-bold text-white">{totalCompleted}</p>
            <p className="text-[10px] text-vs-muted">Treinos</p>
          </div>
        </Card>

        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mx-auto mb-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-xl font-bold text-white">{streakDays}</p>
            <p className="text-[10px] text-vs-muted">Sequência</p>
          </div>
        </Card>

        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-1.5">
              <Calendar className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xl font-bold text-white">{weeklyLogs.length}</p>
            <p className="text-[10px] text-vs-muted">Semana</p>
          </div>
        </Card>
      </motion.div>

      {totalTimeSpent > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-vs-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-vs-primary" />
                </div>
                <div>
                  <p className="text-xs text-vs-muted">Tempo Total</p>
                  <p className="text-lg font-bold text-white">
                    {formatTime(totalTimeSpent)}
                  </p>
                </div>
              </div>
              <Zap className="w-5 h-5 text-vs-muted" />
            </div>
          </Card>
        </motion.div>
      )}

      {lastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card
            className="cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => navigate('/student/chat')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-vs-primary" />
                <span className="text-xs font-medium text-vs-primary">
                  Personal Trainer
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-vs-muted" />
            </div>
            <p className="text-sm text-vs-text line-clamp-2">
              {lastMessage.content}
            </p>
            <p className="text-xs text-vs-muted mt-1">
              {timeAgo(lastMessage.created_at)}
            </p>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <p className="text-xs font-medium text-vs-muted uppercase tracking-wider mb-3">
          Acesso Rápido
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: Dumbbell,
              label: 'Treinos',
              color: 'bg-vs-primary/10 text-vs-primary',
              path: '/student/workouts',
            },
            {
              icon: BarChart3,
              label: 'Progresso',
              color: 'bg-blue-500/10 text-blue-400',
              path: '/student/progress',
            },
            {
              icon: MessageSquare,
              label: 'Chat',
              color: 'bg-green-500/10 text-green-400',
              path: '/student/chat',
            },
            {
              icon: User,
              label: 'Perfil',
              color: 'bg-purple-500/10 text-purple-400',
              path: '/student/profile',
            },
          ].map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(item.path)}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                  item.color
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white">
                {item.label}
              </p>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
