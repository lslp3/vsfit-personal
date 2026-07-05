import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import {
  formatDate,
  formatPhone,
} from '../../lib/formatters';
import {
  approveCref,
  getTrainerProfile,
  rejectCref,
} from '../../services/trainerService';
import type {
  TrainerProfile,
} from '../../types/database';

export function TrainerApprovalPage() {
  const { id } = useParams<{
    id: string;
  }>();

  const navigate = useNavigate();

  const [trainer, setTrainer] =
    useState<TrainerProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<'approve' | 'reject' | null>(
      null
    );

  const [error, setError] =
    useState('');

  const [rejectOpen, setRejectOpen] =
    useState(false);

  const [rejectReason, setRejectReason] =
    useState('');

  const loadTrainer =
    useCallback(async () => {
      if (!id) {
        setError(
          'Personal não identificado.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data =
          await getTrainerProfile(id);

        if (!data) {
          throw new Error(
            'Personal não encontrado.'
          );
        }

        setTrainer(data);
      } catch (loadError) {
        console.error(
          '[TrainerApprovalPage] load:',
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar o personal.'
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    void loadTrainer();
  }, [loadTrainer]);

  async function handleApprove() {
    if (!trainer?.id) return;

    setActionLoading('approve');
    setError('');

    try {
      await approveCref(trainer.id);

      navigate('/admin/trainers', {
        replace: true,
      });
    } catch (approveError) {
      console.error(
        '[TrainerApprovalPage] approve:',
        approveError
      );

      setError(
        'Não foi possível aprovar o CREF.'
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (
      !trainer?.id ||
      !rejectReason.trim()
    ) {
      return;
    }

    setActionLoading('reject');
    setError('');

    try {
      await rejectCref(
        trainer.id,
        rejectReason
      );

      setRejectOpen(false);

      navigate('/admin/trainers', {
        replace: true,
      });
    } catch (rejectError) {
      console.error(
        '[TrainerApprovalPage] reject:',
        rejectError
      );

      setError(
        'Não foi possível rejeitar o CREF.'
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-red-400" />

          <p className="mt-4 font-black text-white">
            Personal não encontrado
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            {error}
          </p>

          <Button
            className="mt-5"
            onClick={() =>
              navigate('/admin/trainers')
            }
          >
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const hasCref =
    Boolean(trainer.cref?.trim());

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <button
        type="button"
        onClick={() =>
          navigate('/admin/trainers')
        }
        className="flex items-center gap-2 text-sm font-bold text-zinc-500 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para personais
      </button>

      <div>
        <h1 className="text-2xl font-black text-white md:text-3xl">
          Verificação de CREF
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Revise os dados antes de
          aprovar ou rejeitar.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <Card className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
            {trainer.name
              ?.charAt(0)
              .toUpperCase() || 'P'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black text-white">
                {trainer.name}
              </h2>

              <Badge
                status={
                  trainer.cref_status ||
                  'not_submitted'
                }
              />
            </div>

            <p className="mt-1 truncate text-sm text-zinc-500">
              {trainer.email}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
              Número do CREF
            </p>

            <p className="mt-2 text-base font-black text-white">
              {trainer.cref ||
                'Não enviado'}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
              Data de envio
            </p>

            <p className="mt-2 text-sm font-bold text-white">
              {formatDate(
                trainer.cref_submitted_at
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Mail className="h-4 w-4" />

            <span className="truncate">
              {trainer.email}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Phone className="h-4 w-4" />

            <span>
              {formatPhone(
                trainer.phone
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <MapPin className="h-4 w-4" />

            <span>
              {trainer.location || '—'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="h-4 w-4" />

            <span>
              Cadastro:{' '}
              {formatDate(
                trainer.created_at
              )}
            </span>
          </div>
        </div>

        {trainer.bio && (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
              Apresentação
            </p>

            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {trainer.bio}
            </p>
          </div>
        )}

        {trainer.cref_rejection_reason && (
          <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-xs font-black uppercase text-red-300">
              Motivo da última rejeição
            </p>

            <p className="mt-2 text-sm text-red-200">
              {
                trainer.cref_rejection_reason
              }
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-start gap-3 rounded-[20px] border border-yellow-400/20 bg-yellow-400/[0.08] p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />

        <div>
          <p className="text-sm font-black text-yellow-200">
            Verificação manual obrigatória
          </p>

          <p className="mt-1 text-xs leading-relaxed text-yellow-100/65">
            Consulte o número informado
            em uma fonte oficial do
            CONFEF ou CREF antes de
            aprovar.
          </p>
        </div>
      </div>

      {!hasCref ? (
        <Card className="p-5 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-zinc-600" />

          <p className="mt-3 font-black text-white">
            CREF não enviado
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Este personal ainda não
            enviou um número para
            análise.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            onClick={() =>
              void handleApprove()
            }
            loading={
              actionLoading === 'approve'
            }
            disabled={
              trainer.cref_status ===
                'approved' ||
              actionLoading !== null
            }
            className="h-14"
          >
            <Check className="h-5 w-5" />

            {trainer.cref_status ===
            'approved'
              ? 'CREF aprovado'
              : 'Aprovar CREF'}
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              setRejectReason('');
              setRejectOpen(true);
            }}
            disabled={
              actionLoading !== null
            }
            className="h-14"
          >
            <X className="h-5 w-5" />
            Rejeitar CREF
          </Button>
        </div>
      )}

      <Modal
        open={rejectOpen}
        onClose={() =>
          setRejectOpen(false)
        }
        title="Rejeitar CREF"
      >
        <div className="space-y-4">
          <div className="rounded-[16px] border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm font-black text-red-300">
              {trainer.name}
            </p>

            <p className="mt-1 text-xs text-red-200/70">
              O personal receberá uma
              notificação com o motivo.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
              Motivo da rejeição
            </label>

            <textarea
              value={rejectReason}
              onChange={(event) =>
                setRejectReason(
                  event.target.value
                )
              }
              placeholder="Explique por que o CREF não foi aprovado..."
              className="input-field min-h-[120px] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() =>
                setRejectOpen(false)
              }
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              className="flex-1"
              onClick={() =>
                void handleReject()
              }
              loading={
                actionLoading === 'reject'
              }
              disabled={
                !rejectReason.trim()
              }
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TrainerApprovalPage;