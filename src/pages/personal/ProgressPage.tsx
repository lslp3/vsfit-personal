import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Dumbbell, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as workoutService from '../../services/workoutService';
import type { WorkoutLog } from '../../types/database';
import { timeAgo } from '../../lib/formatters';

interface StudentStats {
  studentId: string;
  studentName: string;
  totalWorkouts: number;
  completedWorkouts: number;
  lastWorkout: string | null;
}

export function ProgressPage() {
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trainerProfile) return;
    fetchStudents(trainerProfile.id);
    setLoading(true);
    workoutService
      .getWorkoutLogsByTrainer(trainerProfile.id)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainerProfile, fetchStudents]);

  const activeStudents = students.filter((s) => s.status === 'active').length;
  const totalWorkouts = logs.length;
  const completedWorkouts = logs.filter((l) => l.status === 'completed').length;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
  const uniqueStudentsWithLogs = new Set(logs.map((l) => l.student_id)).size;

  const studentStats: StudentStats[] = students
    .map((s) => {
      const studentLogs = logs.filter((l) => l.student_id === s.id);
      return {
        studentId: s.id,
        studentName: s.name,
        totalWorkouts: studentLogs.length,
        completedWorkouts: studentLogs.filter((l) => l.status === 'completed').length,
        lastWorkout: studentLogs[0]?.created_at || null,
      };
    })
    .filter((s) => s.totalWorkouts > 0)
    .sort((a, b) => b.totalWorkouts - a.totalWorkouts);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <Header title="Progresso" showBack />

      <div className="page-container space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-vs-muted" />
          </div>
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3"
            >
              <motion.div variants={item}>
                <Card>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-vs-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-vs-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
                  <p className="text-xs text-vs-muted">Treinos realizados</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{activeStudents}</p>
                  <p className="text-xs text-vs-muted">Alunos ativos</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{completionRate}%</p>
                  <p className="text-xs text-vs-muted">Taxa de conclusão</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{uniqueStudentsWithLogs}</p>
                  <p className="text-xs text-vs-muted">Alunos com treinos</p>
                </Card>
              </motion.div>
            </motion.div>

            <h3 className="text-sm font-medium text-vs-muted mt-4">Progresso por aluno</h3>

            {studentStats.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-8 h-8 text-vs-muted" />}
                title="Nenhum dado ainda"
                description="Os treinos dos seus alunos aparecerão aqui conforme eles forem realizados."
              />
            ) : (
              <div className="space-y-2">
                {studentStats.map((stat) => (
                  <Card key={stat.studentId}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{stat.studentName}</p>
                        <p className="text-xs text-vs-muted mt-0.5">
                          {stat.completedWorkouts}/{stat.totalWorkouts} treinos concluídos
                          {stat.lastWorkout && ` • Último: ${timeAgo(stat.lastWorkout)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{stat.totalWorkouts}</div>
                        <div className="text-[10px] text-vs-muted">treinos</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-vs-primary to-orange-500 rounded-full transition-all"
                        style={{
                          width: `${stat.totalWorkouts > 0 ? (stat.completedWorkouts / stat.totalWorkouts) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
