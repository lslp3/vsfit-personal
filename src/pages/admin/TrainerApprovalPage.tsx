import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { getAllTrainers, approveCref, rejectCref } from '../../services/trainerService';
import { formatDate } from '../../lib/formatters';

export function TrainerApprovalPage() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; trainerId: string; trainerName: string }>({
    open: false,
    trainerId: '',
    trainerName: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  async function loadPending() {
    setLoading(true);
    try {
      const all = await getAllTrainers();
      setTrainers(all.filter((t: any) => t.cref_status === 'pending'));
    } catch (err) {
      console.error('Failed to load trainers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function handleApprove(trainerId: string) {
    setActionLoading(trainerId);
    try {
      await approveCref(trainerId);
      setTrainers((prev) => prev.filter((t) => t.id !== trainerId));
    } catch (err) {
      console.error('Failed to approve CREF:', err);
    } finally {
      setActionLoading(null);
    }
  }

  function openRejectModal(trainerId: string, trainerName: string) {
    setRejectReason('');
    setRejectModal({ open: true, trainerId, trainerName });
  }

  async function handleReject() {
    const { trainerId } = rejectModal;
    if (!rejectReason.trim()) return;
    setActionLoading(trainerId);
    try {
      await rejectCref(trainerId, rejectReason.trim());
      setTrainers((prev) => prev.filter((t) => t.id !== trainerId));
      setRejectModal({ open: false, trainerId: '', trainerName: '' });
    } catch (err) {
      console.error('Failed to reject CREF:', err);
    } finally {
      setActionLoading(null);
    }
  }

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
        <h1 className="text-2xl md:text-3xl font-bold text-white">Aprovação de CREF</h1>
        <p className="text-vs-muted text-sm mt-1">
          {trainers.length} {trainers.length === 1 ? 'personal aguardando' : 'personais aguardando'} aprovação
        </p>
      </motion.div>

      {trainers.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8 text-green-400" />}
          title="Nenhuma pendência"
          description="Todos os CREFs foram processados."
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { transition: { staggerChildren: 0.07 } },
          }}
          className="space-y-4"
        >
          {trainers.map((trainer: any) => (
            <motion.div
              key={trainer.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-yellow-400">
                        {trainer.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{trainer.name}</p>
                      <p className="text-sm text-vs-muted truncate">{trainer.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-vs-muted">
                          CREF: {trainer.cref || '—'}
                        </span>
                        <span className="text-xs text-vs-muted">
                          Enviado: {formatDate(trainer.cref_submitted_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {trainer.bio && (
                  <p className="mt-3 text-sm text-vs-muted leading-relaxed">{trainer.bio}</p>
                )}

                <div className="mt-4 flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(trainer.id)}
                    loading={actionLoading === trainer.id}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4" />
                    Aprovar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openRejectModal(trainer.id, trainer.name)}
                    disabled={actionLoading === trainer.id}
                    className="flex-1"
                  >
                    <X className="w-4 h-4" />
                    Rejeitar
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal((prev) => ({ ...prev, open: false }))}
        title="Rejeitar CREF"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Rejeitar CREF de {rejectModal.trainerName}</p>
              <p className="text-xs text-vs-muted mt-1">Esta ação informará o personal sobre a rejeição.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-vs-muted mb-1.5">Motivo da rejeição</label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="Descreva o motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setRejectModal((prev) => ({ ...prev, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleReject}
              loading={actionLoading === rejectModal.trainerId}
              disabled={!rejectReason.trim()}
            >
              <X className="w-4 h-4" />
              Rejeitar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
