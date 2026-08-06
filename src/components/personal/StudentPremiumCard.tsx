import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Dumbbell,
  KeyRound,
  Scale,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Student } from '../../types/database';
import type { StudentCardAudit } from '../../services/auditService';

type Props = {
  student: Student;
  audit: StudentCardAudit | null;
};

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getAvatarUrl(student: Student) {
  return (
    student.avatar_url ||
    (student as any).photo_url ||
    (student as any).profile_photo_url ||
    (student as any).image_url ||
    ''
  );
}

function hasAppAccess(student: Student) {
  const accounts = (student as any).student_accounts || (student as any).student_account;

  return (
    Boolean(student.auth_user_id) ||
    (Array.isArray(accounts)
      ? accounts.some((account: any) => account.auth_user_id)
      : Boolean(accounts?.auth_user_id)) ||
    (student as any).has_app_access === true ||
    (student as any).app_access === true
  );
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || 'active').toLowerCase();

  const label =
    normalized === 'active'
      ? 'Ativo'
      : normalized === 'paused'
        ? 'Pausado'
        : normalized === 'inactive'
          ? 'Inativo'
          : 'Ativo';

  const className =
    normalized === 'active'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : normalized === 'paused'
        ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
        : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300';

  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
        className
      )}
    >
      {label}
    </span>
  );
}

function InfoTile({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  emphasis?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-2.5">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          emphasis === 'good'
            ? 'bg-emerald-400/10 text-emerald-300'
            : emphasis === 'bad'
              ? 'bg-red-500/10 text-red-300'
              : 'bg-white/[0.055] text-[#ff2a32]'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">{label}</p>
        <p className="truncate text-[12px] font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function formatDays(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'Hoje';
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

function formatWeight(weight: number | null): string {
  if (weight === null) return '—';
  return `${weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

export function StudentPremiumCard({ student, audit }: Props) {
  const navigate = useNavigate();

  const avatarUrl = getAvatarUrl(student);
  const access = hasAppAccess(student);
  const hasActivePlan = Boolean(audit?.activePlanName);
  const daysSince = audit?.daysSinceLastWorkout ?? null;
  const attention = Boolean(audit?.needsAttention);

  const overdue = Boolean(audit?.isOverdue);
  const showAttention =
    attention &&
    (!hasActivePlan || daysSince === null || (daysSince !== null && daysSince >= 7) || overdue);

  return (
    <div
      onClick={() => navigate(`/personal/students/${student.id}`)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[24px] border bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-all hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]',
        showAttention ? 'border-red-500/25' : 'border-white/10'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={student.name || 'Aluno'}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#ff2a32]/15 text-[15px] font-black text-[#ff2a32]">
              {getStudentInitials(student.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black tracking-[-0.02em] text-white">
                {student.name}
              </h3>
              <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-400">
                {student.email || 'Sem email'}
              </p>
            </div>

            <StatusBadge status={student.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
                access
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/10 bg-white/[0.04] text-zinc-400'
              )}
            >
              <KeyRound className="h-3 w-3" />
              {access ? 'Com acesso' : 'Sem acesso'}
            </span>

            {showAttention && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
                <AlertTriangle className="h-3 w-3" />
                Atenção
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoTile
          icon={<Dumbbell className="h-4 w-4" />}
          label="Treino ativo"
          value={hasActivePlan ? audit!.activePlanName : 'Sem plano'}
          emphasis={hasActivePlan ? 'good' : 'warn'}
        />

        <InfoTile
          icon={<Zap className="h-4 w-4" />}
          label="Último treino"
          value={daysSince === null ? 'Nunca treinou' : formatDays(daysSince)}
          emphasis={
            daysSince === null ? 'bad' : daysSince >= 7 ? 'warn' : 'good'
          }
        />

        <InfoTile
          icon={<CalendarClock className="h-4 w-4" />}
          label="Próx. vencimento"
          value={
            overdue
              ? 'Pagamento atrasado'
              : audit?.nextDueDate
                ? new Date(audit.nextDueDate).toLocaleDateString('pt-BR')
                : 'Sem cobrança'
          }
          emphasis={overdue ? 'bad' : 'warn'}
        />

        <InfoTile
          icon={<Scale className="h-4 w-4" />}
          label="Peso"
          value={
            audit?.weightDelta === null || audit?.weightDelta === undefined
              ? formatWeight(audit?.lastWeight ?? null)
              : `${formatWeight(audit.lastWeight)} (${audit.weightDelta > 0 ? '+' : ''}${audit.weightDelta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)`
          }
          emphasis="good"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                audit?.adherencePercent === null || audit?.adherencePercent === undefined
                  ? 'bg-zinc-600'
                  : audit.adherencePercent >= 60
                    ? 'bg-emerald-400'
                    : audit.adherencePercent >= 30
                      ? 'bg-yellow-400'
                      : 'bg-red-500'
              )}
              style={{
                width: `${Math.min(100, audit?.adherencePercent ?? 0)}%`,
              }}
            />
          </div>
          <span className="text-[11px] font-bold text-zinc-400">
            Aderência {audit?.adherencePercent === null || audit?.adherencePercent === undefined ? '—' : `${audit.adherencePercent}%`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-zinc-500 transition-colors group-hover:text-[#ff2a32]">
          {audit?.weightDelta !== null && audit?.weightDelta !== undefined && audit.weightDelta !== 0 ? (
            audit.weightDelta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )
          ) : null}
          Ver perfil
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}