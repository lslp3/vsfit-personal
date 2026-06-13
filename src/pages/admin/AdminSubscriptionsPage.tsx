import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Check, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { getAllSubscriptionPlans } from '../../services/subscriptionService';
import { formatCurrency } from '../../lib/formatters';

export function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const planData = await getAllSubscriptionPlans();
        setPlans(planData);
      } catch (err) {
        console.error('Failed to load subscriptions or plans:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vs-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Assinaturas</h1>
        <p className="mt-1 text-sm text-vs-muted">
          0 assinaturas ativas na plataforma (funcionalidade em desenvolvimento)
        </p>
      </motion.div>

      <section>
        <h2 className="mb-4 text-lg font-bold text-white">Planos Disponíveis</h2>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plans.map((plan: any) => (
            <motion.div
              key={plan.id || plan.slug}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card className={`p-5 ${plan.price_monthly === 0 ? 'border-vs-primary/20' : ''}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-white">{plan.name}</h3>

                  {plan.price_monthly === 0 && (
                    <span className="rounded-full border border-vs-primary/30 bg-vs-primary/20 px-2 py-0.5 text-xs text-vs-primary">
                      Grátis
                    </span>
                  )}
                </div>

                <p className="mb-1 text-3xl font-bold text-white">
                  {plan.price_monthly === 0 ? 'Grátis' : formatCurrency(plan.price_monthly)}
                </p>

                <p className="mb-4 text-sm text-vs-muted">
                  <Users className="mr-1 inline h-4 w-4" />
                  {Number(plan.student_limit) >= 999999
                    ? 'Alunos ilimitados'
                    : `Até ${plan.student_limit} ${
                        Number(plan.student_limit) === 1 ? 'aluno' : 'alunos'
                      }`}
                </p>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={`${feature}-${index}`} className="flex items-start gap-2 text-sm text-vs-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}