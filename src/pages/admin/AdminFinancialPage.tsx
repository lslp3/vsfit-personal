import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ArrowRight, Calendar, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { getAdminDashboardStats, getAdminPayments } from '../../services/adminService';
import { formatCurrency, formatDate } from '../../lib/formatters';

export function AdminFinancialPage() {
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, paymentsData] = await Promise.all([
          getAdminDashboardStats(),
          getAdminPayments(),
        ]);
        setStats(statsData);
        setPayments(paymentsData);
      } catch (err) {
        console.error('Failed to load financial data:', err);
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Financeiro</h1>
        <p className="text-vs-muted text-sm mt-1">Visão geral de pagamentos e receitas da plataforma</p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { transition: { staggerChildren: 0.07 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</p>
            <p className="text-sm text-vs-muted mt-1">Receita Total (Assinaturas)</p>
          </Card>
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.subscriptions || 0}</p>
            <p className="text-sm text-vs-muted mt-1">Assinaturas Ativas</p>
          </Card>
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
            <p className="text-sm text-vs-muted mt-1">Total de Transações</p>
          </Card>
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.trainerCount || 0}</p>
            <p className="text-sm text-vs-muted mt-1">Personais Cadastrados</p>
          </Card>
        </motion.div>
      </motion.div>

      <section>
        <h2 className="text-lg font-bold text-white mb-4">Pagamentos Recentes</h2>
        {payments.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-8 h-8 text-vs-muted" />}
            title="Nenhum pagamento"
            description="Nenhuma transação registrada na plataforma."
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { transition: { staggerChildren: 0.04 } },
            }}
            className="space-y-3"
          >
            {payments.map((payment: any) => (
              <motion.div
                key={payment.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-vs-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5 text-vs-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {payment.students?.name || payment.student_name || 'Aluno'}
                        </p>
                        <p className="text-xs text-vs-muted truncate">
                          Personal: {payment.trainer_profiles?.name || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{formatCurrency(payment.amount)}</p>
                      <Badge status={payment.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-vs-muted">
                    <Calendar className="w-3 h-3" />
                    {formatDate(payment.created_at)}
                    {payment.method && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        {payment.method}
                      </>
                    )}
                  </div>
                  {payment.description && (
                    <p className="mt-1 text-xs text-vs-muted">{payment.description}</p>
                  )}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
