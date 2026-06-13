import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Award, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { getAdminDashboardStats } from '../../services/adminService';
import { getAllTrainers } from '../../services/trainerService';

export function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, trainersData] = await Promise.all([
          getAdminDashboardStats(),
          getAllTrainers(),
        ]);
        setStats(statsData);
        setTrainers(trainersData);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-vs-primary animate-spin" />
      </div>
    );
  }

  const activeTrainers = trainers.filter((t: any) => t.cref_status === 'approved');
  const studentPerTrainer = stats?.studentCount && activeTrainers.length
    ? (stats.studentCount / activeTrainers.length).toFixed(1)
    : '0';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Relatórios</h1>
        <p className="text-vs-muted text-sm mt-1">Métricas e análises da plataforma</p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vs-primary/20 to-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-vs-primary" />
              </div>
              <h2 className="font-bold text-white">Crescimento de Personais</h2>
            </div>
            <div className="flex items-end gap-2 h-24">
              <div className="flex-1 bg-vs-primary/20 rounded-t-lg h-12 transition-all" />
              <div className="flex-1 bg-vs-primary/30 rounded-t-lg h-16 transition-all" />
              <div className="flex-1 bg-vs-primary/40 rounded-t-lg h-20 transition-all" />
              <div className="flex-1 bg-vs-primary/50 rounded-t-lg h-14 transition-all" />
              <div className="flex-1 bg-vs-primary/60 rounded-t-lg h-18 transition-all" />
              <div className="flex-1 bg-vs-primary rounded-t-lg h-24 transition-all" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-vs-muted">
              <span>Jan</span>
              <span>Fev</span>
              <span>Mar</span>
              <span>Abr</span>
              <span>Mai</span>
              <span>Jun</span>
            </div>
            <p className="mt-3 text-sm text-vs-muted">
              <span className="text-white font-semibold">{trainers.length}</span> personais cadastrados no total
            </p>
          </Card>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="font-bold text-white">Receita ao Longo do Tempo</h2>
            </div>
            <div className="flex items-end gap-2 h-24">
              <div className="flex-1 bg-green-500/20 rounded-t-lg h-10 transition-all" />
              <div className="flex-1 bg-green-500/30 rounded-t-lg h-14 transition-all" />
              <div className="flex-1 bg-green-500/40 rounded-t-lg h-18 transition-all" />
              <div className="flex-1 bg-green-500/30 rounded-t-lg h-12 transition-all" />
              <div className="flex-1 bg-green-500/50 rounded-t-lg h-20 transition-all" />
              <div className="flex-1 bg-green-500 rounded-t-lg h-22 transition-all" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-vs-muted">
              <span>Jan</span>
              <span>Fev</span>
              <span>Mar</span>
              <span>Abr</span>
              <span>Mai</span>
              <span>Jun</span>
            </div>
            <p className="mt-3 text-sm text-vs-muted">Receita mensal de assinaturas</p>
          </Card>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="font-bold text-white">Distribuição de Alunos</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-vs-muted">Total de Alunos</span>
                <span className="text-lg font-bold text-white">{stats?.studentCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-vs-muted">Personais Aprovados</span>
                <span className="text-lg font-bold text-white">{activeTrainers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-vs-muted">Média Alunos/Personal</span>
                <span className="text-lg font-bold text-white">{studentPerTrainer}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-vs-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-vs-muted">Distribuição</span>
                  <span className="text-xs text-vs-muted">{stats?.studentCount || 0} alunos</span>
                </div>
                {activeTrainers.slice(0, 5).map((trainer: any, i: number) => {
                  const pct = activeTrainers.length > 0 ? 100 / activeTrainers.length : 0;
                  return (
                    <div key={trainer.id} className="flex items-center gap-2 py-1">
                      <span className="text-xs text-vs-muted w-6">{i + 1}.</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-vs-primary/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-vs-muted truncate w-20 text-right">{trainer.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="font-bold text-white">Personais Mais Ativos</h2>
            </div>
            {activeTrainers.length === 0 ? (
              <p className="text-sm text-vs-muted">Nenhum personal ativo no momento.</p>
            ) : (
              <div className="space-y-3">
                {activeTrainers.slice(0, 5).map((trainer: any, i: number) => (
                  <div key={trainer.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-vs-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-vs-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{trainer.name}</p>
                      <p className="text-xs text-vs-muted truncate">{trainer.email}</p>
                    </div>
                    <Award
                      className={`w-5 h-5 ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                          ? 'text-gray-400'
                          : i === 2
                          ? 'text-orange-400'
                          : 'text-vs-muted'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
