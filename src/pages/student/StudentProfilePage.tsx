import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  Cake,
  Target,
  Dumbbell,
  Calendar,
  LogOut,
  Edit3,
  Weight,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { formatDate, formatPhone } from '../../lib/formatters';
import type { StudentGoals } from '../../types/database';

export function StudentProfilePage() {
  const navigate = useNavigate();
  const { user, student: storeStudent, studentAccount, isLoading, logout } = useAuthStore();

  const [goals, setGoals] = useState<StudentGoals | null>(null);
  const [loading, setLoading] = useState(true);

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!user || !studentId) return;
    loadData();
  }, [user, studentId]);

  async function loadData() {
    try {
      const { data: goalsData } = await supabase
        .from('student_goals')
        .select('*')
        .eq('student_id', studentId!)
        .single();

      setGoals(goalsData as StudentGoals | null);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/auth/login', { replace: true });
  }

  if (loading || isLoading || !studentId || !storeStudent) return <LoadingScreen />;

  return (
    <div className="page-container space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center py-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-vs-primary to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-vs-primary/20">
          <span className="text-2xl font-bold text-white">
            {storeStudent.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">{storeStudent.name}</h1>
        <p className="text-sm text-vs-muted">Aluno</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <h2 className="text-sm font-semibold text-white mb-3">
            Informações Pessoais
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Mail className="w-4 h-4 text-vs-muted" />
              </div>
              <div>
                <p className="text-xs text-vs-muted">Email</p>
                <p className="text-sm text-white">{storeStudent.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Phone className="w-4 h-4 text-vs-muted" />
              </div>
              <div>
                <p className="text-xs text-vs-muted">Telefone</p>
                <p className="text-sm text-white">
                  {formatPhone(storeStudent.phone)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Cake className="w-4 h-4 text-vs-muted" />
              </div>
              <div>
                <p className="text-xs text-vs-muted">Data de Nascimento</p>
                <p className="text-sm text-white">
                  {formatDate(storeStudent.birth_date)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {goals && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <h2 className="text-sm font-semibold text-white mb-3">
              Metas e Objetivos
            </h2>
            <div className="space-y-3">
              {goals.objective && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-vs-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-vs-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-vs-muted">Objetivo</p>
                    <p className="text-sm text-white">{goals.objective}</p>
                  </div>
                </div>
              )}

              {goals.level && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-vs-muted">Nível</p>
                    <p className="text-sm text-white">{goals.level}</p>
                  </div>
                </div>
              )}

              {goals.weekly_frequency && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-vs-muted">Frequência Semanal</p>
                    <p className="text-sm text-white">
                      {goals.weekly_frequency}x por semana
                    </p>
                  </div>
                </div>
              )}

              {goals.target_weight && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Weight className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-vs-muted">Peso Meta</p>
                    <p className="text-sm text-white">
                      {goals.target_weight} kg
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <h2 className="text-sm font-semibold text-white mb-3">Conta</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Mail className="w-4 h-4 text-vs-muted" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-vs-muted">Email de acesso</p>
                <p className="text-sm text-white">{storeStudent.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Zap className="w-4 h-4 text-vs-muted" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-vs-muted">Último acesso</p>
                <p className="text-sm text-white">
                  {storeStudent.updated_at
                    ? formatDate(storeStudent.updated_at)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="space-y-3 pb-8"
      >
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {}}
        >
          <Edit3 className="w-4 h-4" />
          Editar Perfil
        </Button>

        <Button
          variant="danger"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </motion.div>
    </div>
  );
}
