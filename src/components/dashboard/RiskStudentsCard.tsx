import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { getInitials } from '../../lib/utils';
import { formatDate, getStatusColor, getStatusLabel } from '../../lib/formatters';
import type { StudentRisk } from '../../types/analytics';

export interface RiskStudentsCardProps {
  /** Alunos em risco (AnalyticsSummary.studentsAtRisk). */
  students: StudentRisk[];
}

/**
 * Lista "Alunos que precisam de atenção": sem treinar há X dias e/ou
 * pagamento atrasado. Dados por props — sem fetch interno.
 */
export function RiskStudentsCard({ students }: RiskStudentsCardProps) {
  if (students.length === 0) {
    return (
      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-vs-muted" />
          <h3 className="text-sm font-bold text-white">Alunos que precisam de atenção</h3>
        </div>
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8 text-vs-muted" />}
          title="Nenhum aluno em risco"
          description="Todos os alunos ativos treinaram recentemente e estão com os pagamentos em dia."
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-vs-primary" />
        <h3 className="text-sm font-bold text-white">Alunos que precisam de atenção</h3>
        <span className="ml-auto rounded-full bg-vs-primary/15 px-2 py-0.5 text-[11px] font-bold text-vs-primary">
          {students.length}
        </span>
      </div>

      <div className="space-y-3">
        {students.map((student) => (
          <div
            key={student.studentId}
            className="flex items-start gap-3 rounded-xl border border-vs-border bg-white/[0.03] p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vs-primary/15 text-xs font-black text-vs-primary">
              {getInitials(student.studentName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-white">
                  {student.studentName}
                </p>
                {student.paymentStatus && (
                  <span
                    className={`rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold ${getStatusColor(student.paymentStatus)}`}
                  >
                    {getStatusLabel(student.paymentStatus)}
                  </span>
                )}
              </div>

              <ul className="mt-1.5 space-y-1">
                {student.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center gap-1.5 text-[11px] text-vs-muted"
                  >
                    {reason.toLowerCase().includes('pagamento') ? (
                      <DollarSign className="h-3 w-3 shrink-0 text-vs-primary" />
                    ) : (
                      <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                    )}
                    <span className="truncate">{reason}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-1.5 text-[10px] text-zinc-600">
                Último treino:{' '}
                {student.lastWorkout ? formatDate(student.lastWorkout) : 'nunca'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}