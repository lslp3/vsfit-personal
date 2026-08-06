import { useState } from 'react';
import {
  Download,
  MessageSquareText,
  BellRing,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Student } from '../../types/database';
import type { StudentCardAudit } from '../../services/auditService';
import { buildStudentsCsv, downloadStudentsCsv } from '../../lib/studentFilters';
import { sendMessage } from '../../services/messageService';
import { updateStudent } from '../../services/studentService';
import { pushSystemNotification } from '../../services/pushTrigger';

type BulkActionMode = 'status' | 'message' | 'push' | null;

interface BulkActionsPanelProps {
  selected: Student[];
  auditMap: Record<string, StudentCardAudit | undefined>;
  trainerId?: string;
  onDone: () => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'inactive', label: 'Inativo' },
];

const btnGhost =
  'rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[12px] font-black uppercase tracking-wide text-zinc-400 transition-all hover:border-white/20 hover:text-white';

const btnPrimary =
  'inline-flex items-center gap-2 rounded-full border border-[#ff2a32]/40 bg-[#ff2a32]/20 px-4 py-2 text-[12px] font-black uppercase tracking-wide text-[#ff2a32] transition-all hover:bg-[#ff2a32]/30 disabled:cursor-not-allowed disabled:opacity-50';

function countLabel(count: number): string {
  return count === 1 ? '1 aluno' : `${count} alunos`;
}

/**
 * SPRINT 16 · FASE 5 · ETAPA 3 — Ações em massa da Central de Alunos.
 *
 * Export CSV (100% client-side) · Alterar status · Enviar mensagem · Enviar push.
 * Reutiliza messageService / studentService / pushTrigger — NENHUMA query nova,
 * NENHUM backend novo. Cada ação pede confirmação antes de executar.
 */
export function BulkActionsPanel({ selected, auditMap, trainerId, onDone }: BulkActionsPanelProps) {
  const [mode, setMode] = useState<BulkActionMode>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [statusTarget, setStatusTarget] = useState<string>('active');
  const [result, setResult] = useState<string>('');

  const count = selected.length;
  const noneSelected = count === 0;
  const pushEligible = selected.filter((s) => s.auth_user_id).length;

  const close = () => {
    if (busy) return;
    setMode(null);
    setMessage('');
    setPushTitle('');
    setPushBody('');
    setStatusTarget('active');
    setResult('');
  };

  const handleExport = () => {
    const rows = selected.map((student) => ({
      student,
      audit: auditMap[student.id] || null,
    }));
    const csv = buildStudentsCsv(rows);
    downloadStudentsCsv(csv, `alunos_${new Date().toISOString().slice(0, 10)}.csv`);
    setResult(`CSV exportado com ${countLabel(count)}.`);
    onDone();
  };

  const handleChangeStatus = async () => {
    if (!count || busy) return;
    setBusy(true);
    setResult('');
    let ok = 0;
    for (const s of selected) {
      try {
        await updateStudent(s.id, { status: statusTarget });
        ok += 1;
      } catch {
        // continua com os demais — não quebra a operação
      }
    }
    setBusy(false);
    const targetLabel = STATUS_OPTIONS.find((o) => o.value === statusTarget)?.label || statusTarget;
    setResult(`${ok} ${ok === 1 ? 'aluno atualizado' : 'alunos atualizados'} para "${targetLabel}".`);
    onDone();
  };

  const handleSendMessage = async () => {
    if (!count || busy || !message.trim() || !trainerId) return;
    setBusy(true);
    setResult('');
    let ok = 0;
    for (const s of selected) {
      try {
        await sendMessage({
          trainer_id: trainerId,
          student_id: s.id,
          sender_role: 'personal',
          sender_id: trainerId,
          content: message.trim(),
        });
        ok += 1;
      } catch {
        // continua com os demais
      }
    }
    setBusy(false);
    setResult(`${ok} / ${countLabel(count)} recebeu a mensagem.`);
  };

  const handleSendPush = async () => {
    if (!pushEligible || busy || !pushTitle.trim()) return;
    setBusy(true);
    setResult('');
    let ok = 0;
    for (const s of selected) {
      if (!s.auth_user_id) continue;
      try {
        await pushSystemNotification({
          user: s.auth_user_id,
          title: pushTitle.trim(),
          body: pushBody.trim(),
        });
        ok += 1;
      } catch {
        // continua com os demais
      }
    }
    setBusy(false);
    setResult(`Notificação enviada para ${ok} de ${pushEligible} alunos elegíveis.`);
  };

  if (noneSelected) return null;

  return (
    <>
      {/* Botões de ação em massa (só quando há seleção) */}
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.045] px-4 py-3">
        <span className="text-[12px] font-black uppercase tracking-wide text-zinc-500">
          Ações ({countLabel(count)}):
        </span>

        <ActionButton onClick={handleExport} icon={<Download className="h-3.5 w-3.5" />} label="Exportar" />
        <ActionButton onClick={() => setMode('status')} icon={<RefreshCw className="h-3.5 w-3.5" />} label="Alterar status" />
        <ActionButton onClick={() => setMode('message')} icon={<MessageSquareText className="h-3.5 w-3.5" />} label="Enviar mensagem" />
        <ActionButton onClick={() => setMode('push')} icon={<BellRing className="h-3.5 w-3.5" />} label="Enviar push" />
      </div>

      {/* Confirmação — Alterar status */}
      <Modal open={mode === 'status'} onClose={close} title="Alterar status em massa">
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-400">
            Você está prestes a alterar o status de <b className="text-white">{countLabel(count)}</b>.
            O novo status será aplicado a todos os selecionados.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusTarget(opt.value)}
                className={cnToggle(opt.value === statusTarget)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {result && <Result text={result} />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btnGhost}>
              Cancelar
            </button>
            <button type="button" onClick={() => handleChangeStatus()} disabled={busy} className={btnPrimary}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{busy ? 'Aplicando...' : 'Confirmar'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Enviar mensagem em massa */}
      <Modal open={mode === 'message'} onClose={close} title="Enviar mensagem em massa">
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-400">
            A mensagem será enviada como <b className="text-white">Personal</b> para{' '}
            <b className="text-white">{countLabel(count)}</b>.
          </p>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Escreva a mensagem que será enviada aos alunos selecionados..."
            className="w-full resize-none rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:border-[#ff2a32]/40 focus:outline-none"
          />

          {result && <Result text={result} />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btnGhost}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={busy || !message.trim()}
              className={btnPrimary}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{busy ? 'Enviando...' : 'Confirmar envio'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Enviar push em massa */}
      <Modal open={mode === 'push'} onClose={close} title="Enviar notificação (push)">
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-400">
            Notificação será enviada para <b className="text-white">{countLabel(pushEligible)}</b>
            {pushEligible !== count ? (
              <span className="text-zinc-500"> (apenas alunos com acesso ao app)</span>
            ) : null}
            .
          </p>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Título</span>
            <input
              value={pushTitle}
              onChange={(event) => setPushTitle(event.target.value)}
              placeholder="Ex: Novidade no seu treino"
              className="w-full rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:border-[#ff2a32]/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Mensagem</span>
            <textarea
              value={pushBody}
              onChange={(event) => setPushBody(event.target.value)}
              rows={3}
              placeholder="Texto da notificação..."
              className="w-full resize-y rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:border-[#ff2a32]/40 focus:outline-none"
            />
          </label>

          {result && <Result text={result} />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btnGhost}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSendPush()}
              disabled={busy || !pushTitle.trim()}
              className={btnPrimary}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              <span>{busy ? 'Enviando...' : 'Confirmar envio'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-zinc-300 transition-all hover:border-white/20 hover:text-white active:scale-95"
    >
      {icon}
      {label}
    </button>
  );
}

function Result({ text }: { text: string }) {
  return (
    <p className="rounded-[12px] bg-white/[0.04] px-3 py-2 text-[12px] font-bold text-emerald-300">
      {text}
    </p>
  );
}

function cnToggle(active: boolean): string {
  return [
    'rounded-[14px] border px-3 py-2.5 text-[12px] font-black text-white transition-all',
    active
      ? 'border-[#ff2a32]/40 bg-[#ff2a32]/20 text-[#ff2a32]'
      : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/20',
  ].join(' ');
}