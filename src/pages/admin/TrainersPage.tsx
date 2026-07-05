import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
} from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  formatDate,
  formatPhone,
} from '../../lib/formatters';
import {
  getAllTrainers,
  type AdminTrainer,
} from '../../services/trainerService';

type CrefFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'not_submitted';

const filters: Array<{
  value: CrefFilter;
  label: string;
}> = [
  {
    value: 'all',
    label: 'Todos',
  },
  {
    value: 'pending',
    label: 'Pendentes',
  },
  {
    value: 'approved',
    label: 'Aprovados',
  },
  {
    value: 'rejected',
    label: 'Rejeitados',
  },
  {
    value: 'not_submitted',
    label: 'Não enviados',
  },
];

function getPlanLabel(
  trainer: AdminTrainer
) {
  const plan =
    trainer.subscription?.plan_slug ||
    'free';

  if (plan === 'premium') {
    return 'Premium';
  }

  if (plan === 'pro') {
    return 'Pro';
  }

  return 'Free';
}

export function TrainersPage() {
  const navigate = useNavigate();

  const [
    trainers,
    setTrainers,
  ] = useState<AdminTrainer[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<CrefFilter>('all');

  const loadTrainers =
    useCallback(async (
      refresh = false
    ) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const data =
          await getAllTrainers();

        setTrainers(data);
      } catch (loadError) {
        console.error(
          '[TrainersPage] load:',
          loadError
        );

        setError(
          'Não foi possível carregar os personais.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void loadTrainers();
  }, [loadTrainers]);

  const counts = useMemo(() => {
    return {
      total: trainers.length,

      pending: trainers.filter(
        (trainer) =>
          trainer.cref_status ===
          'pending'
      ).length,

      approved: trainers.filter(
        (trainer) =>
          trainer.cref_status ===
          'approved'
      ).length,

      notSubmitted: trainers.filter(
        (trainer) =>
          trainer.cref_status ===
          'not_submitted'
      ).length,
    };
  }, [trainers]);

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return trainers.filter(
        (trainer) => {
          const matchesFilter =
            filter === 'all' ||
            trainer.cref_status ===
              filter;

          const matchesSearch =
            !normalizedSearch ||
            trainer.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            trainer.email
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            trainer.cref
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      trainers,
      search,
      filter,
    ]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <motion.div
        initial={{
          opacity: 0,
          y: -10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">
            Personais e CREF
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Cadastros, planos e análise
            manual de CREF.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadTrainers(true)
          }
          disabled={refreshing}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-5 w-5 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: 'Personais',
            value: counts.total,
          },
          {
            label: 'Pendentes',
            value: counts.pending,
          },
          {
            label: 'Aprovados',
            value: counts.approved,
          },
          {
            label: 'Não enviados',
            value:
              counts.notSubmitted,
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="p-4"
          >
            <p className="text-2xl font-black text-white">
              {item.value}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {item.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar por nome, email ou CREF..."
          className="input-field pl-11"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() =>
              setFilter(item.value)
            }
            className={`chip shrink-0 ${
              filter === item.value
                ? 'chip-active'
                : ''
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <p>{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={
            <Users className="h-8 w-8 text-zinc-600" />
          }
          title="Nenhum personal encontrado"
          description="Altere a busca ou o filtro selecionado."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(
            (trainer) => (
              <Card
                key={trainer.id}
                className="overflow-hidden p-0"
              >
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-base font-black text-[#ff2a32]">
                      {trainer.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        'P'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-white">
                          {trainer.name}
                        </p>

                        <Badge
                          status={
                            trainer.cref_status ||
                            'not_submitted'
                          }
                        />
                      </div>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {trainer.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <ShieldCheck className="h-4 w-4 shrink-0" />

                      <span>
                        CREF:{' '}
                        {trainer.cref ||
                          'Não enviado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Users className="h-4 w-4 shrink-0" />

                      <span>
                        {trainer.student_count}{' '}
                        {trainer.student_count ===
                        1
                          ? 'aluno'
                          : 'alunos'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <CreditCard className="h-4 w-4 shrink-0" />

                      <span>
                        Plano:{' '}
                        {getPlanLabel(
                          trainer
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="h-4 w-4 shrink-0" />

                      <span>
                        Cadastro:{' '}
                        {formatDate(
                          trainer.created_at
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Mail className="h-4 w-4 shrink-0" />

                      <span className="truncate">
                        {trainer.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Phone className="h-4 w-4 shrink-0" />

                      <span>
                        {formatPhone(
                          trainer.phone
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/trainers/${trainer.id}/approve`
                    )
                  }
                  className="flex w-full items-center justify-between border-t border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="text-xs font-black uppercase tracking-[0.08em] text-[#ff2a32]">
                    {trainer.cref_status ===
                    'pending'
                      ? 'Analisar CREF'
                      : 'Ver cadastro'}
                  </span>

                  <ChevronRight className="h-4 w-4 text-[#ff2a32]" />
                </button>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default TrainersPage;