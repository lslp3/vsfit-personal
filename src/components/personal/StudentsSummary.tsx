import { ArrowDownRight, ArrowUpRight, TrendingUp, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/formatters';
import type { PortfolioSummary } from '../../services/auditService';

type Props = {
  summary: PortfolioSummary | null;
};

function StatusCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
      <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          'text-[16px] font-black',
          tone === 'good'
            ? 'text-emerald-300'
            : tone === 'warn'
              ? 'text-yellow-300'
              : 'text-zinc-300'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MoneyTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'bad';
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-2.5">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          tone === 'good'
            ? 'bg-emerald-400/10 text-emerald-300'
            : tone === 'warn'
              ? 'bg-yellow-400/10 text-yellow-300'
              : 'bg-red-500/10 text-red-300'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">{label}</p>
        <p
          className={cn(
            'truncate text-[13px] font-black',
            tone === 'good'
              ? 'text-emerald-300'
              : tone === 'warn'
                ? 'text-yellow-300'
                : 'text-red-300'
          )}
        >
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

const adherenceColor = (value: number | null) =>
  value === null
    ? 'bg-zinc-600'
    : value >= 60
      ? 'bg-emerald-400'
      : value >= 30
        ? 'bg-yellow-400'
        : 'bg-red-500';

export function StudentsSummary({ summary }: Props) {
  if (!summary) return null;

  const hasRevenue = summary.revenueReceived > 0;
  const hasPendings = summary.pendingAmount > 0 || summary.overdueAmount > 0;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
          Resumo da carteira
        </p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">
          últimos 30 dias
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="col-span-3 flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32]/15 text-[#ff2a32]">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
              Total de alunos
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[24px] font-black leading-none text-white">
                {summary.total}
              </p>
              {summary.newStudents > 0 && (
                <p className="text-[11px] font-bold text-emerald-300">
                  +{summary.newStudents} novos
                </p>
              )}
            </div>
          </div>
        </div>

        <StatusCount label="Ativos" value={summary.active} tone="good" />
        <StatusCount label="Pausados" value={summary.paused} tone="warn" />
        <StatusCount label="Inativos" value={summary.inactive} tone="neutral" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] text-[#ff2a32]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
              Aderência média
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={cn('h-full rounded-full', adherenceColor(summary.avgAdherence))}
                  style={{ width: `${Math.min(100, summary.avgAdherence ?? 0)}%` }}
                />
              </div>
              <span className="text-[12px] font-black text-white">
                {summary.avgAdherence === null ? '—' : `${summary.avgAdherence}%`}
              </span>
            </div>
          </div>
        </div>

        <MoneyTile
          label="Em aberto"
          value={summary.pendingAmount}
          tone="warn"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <MoneyTile
          label="Receita (30d)"
          value={summary.revenueReceived}
          tone="good"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <MoneyTile
          label="Inadimplência"
          value={summary.overdueAmount}
          tone={summary.overdueAmount > 0 ? 'bad' : 'good'}
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
      </div>

      {!hasRevenue && !hasPendings && (
        <p className="mt-3 border-t border-white/5 pt-2.5 text-center text-[11px] font-medium text-zinc-500">
          Sem movimentação financeira registrada ainda.
        </p>
      )}
    </div>
  );
}