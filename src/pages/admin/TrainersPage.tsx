import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Mail, Phone, Users, Calendar, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { getAllTrainers } from '../../services/trainerService';
import { formatDate, formatPhone } from '../../lib/formatters';

type CrefFilter = 'all' | 'approved' | 'pending' | 'rejected';

const filters: { value: CrefFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'rejected', label: 'Rejeitados' },
];

export function TrainersPage() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CrefFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllTrainers();
        setTrainers(data);
      } catch (err) {
        console.error('Failed to load trainers:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = trainers.filter((t: any) => {
    const matchesSearch =
      !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.cref?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || t.cref_status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-vs-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Personais</h1>
        <p className="text-vs-muted text-sm mt-1">{trainers.length} personal trainers cadastrados</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vs-muted" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou CREF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`chip transition-colors ${
              filter === f.value ? 'chip-active' : ''
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum personal encontrado"
          description={search ? 'Tente alterar os filtros ou busca.' : 'Nenhum personal cadastrado ainda.'}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="space-y-3"
        >
          {filtered.map((trainer: any) => (
            <motion.div
              key={trainer.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card
                className="p-4"
                onClick={() => setExpandedId(expandedId === trainer.id ? null : trainer.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vs-primary/20 to-orange-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-vs-primary">
                        {trainer.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{trainer.name}</p>
                      <p className="text-xs text-vs-muted truncate">{trainer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge status={trainer.cref_status || 'not_submitted'} />
                    {expandedId === trainer.id ? (
                      <ChevronUp className="w-4 h-4 text-vs-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-vs-muted" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === trainer.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-vs-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-vs-muted">
                          <Mail className="w-4 h-4 shrink-0" />
                          <span className="truncate">{trainer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-vs-muted">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{formatPhone(trainer.phone)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-vs-muted">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>CREF: {trainer.cref || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-vs-muted">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Cadastro: {formatDate(trainer.created_at)}</span>
                        </div>
                      </div>
                      {trainer.bio && (
                        <p className="mt-3 text-sm text-vs-muted leading-relaxed">{trainer.bio}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin/trainer-approval');
                          }}
                          className="btn-ghost text-xs"
                        >
                          Gerenciar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
