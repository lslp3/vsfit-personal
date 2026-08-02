import { useState } from 'react';
import {
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  saveStudentGoals,
} from '../../services/progressService';
import type { StudentGoals } from '../../types/database';

interface GoalsModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  goals?: StudentGoals | null;
  onSaved: () => void;
}

const OBJECTIVES = [
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'recomposicao', label: 'Recomposição' },
  { value: 'forca', label: 'Força' },
  { value: 'resistencia', label: 'Resistência' },
  { value: 'condicionamento', label: 'Condicionamento' },
  { value: 'outro', label: 'Outro' },
];

const LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

function toNumberField(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) return '';
  return String(value).replace('.', ',');
}

function fromNumberField(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

export function GoalsModal({
  open,
  onClose,
  studentId,
  goals,
  onSaved,
}: GoalsModalProps) {
  const [objective, setObjective] = useState(
    goals?.objective || ''
  );
  const [level, setLevel] = useState(
    goals?.level || ''
  );
  const [weeklyFrequency, setWeeklyFrequency] =
    useState(toNumberField(goals?.weekly_frequency));
  const [targetWeight, setTargetWeight] = useState(
    toNumberField(goals?.target_weight)
  );
  const [goalNotes, setGoalNotes] = useState(
    goals?.goal_notes || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      await saveStudentGoals({
        studentId,
        objective: objective.trim() || null,
        level: level.trim() || null,
        weekly_frequency: fromNumberField(
          weeklyFrequency
        ),
        target_weight: fromNumberField(targetWeight),
        goal_notes: goalNotes.trim() || null,
      });

      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar metas.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Metas do aluno"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Objetivo
          </span>

          <select
            value={objective}
            onChange={(event) =>
              setObjective(event.target.value)
            }
            className="w-full rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-black text-white focus:outline-none"
          >
            <option value="">—</option>

            {OBJECTIVES.map((item) => (
              <option
                key={item.value}
                value={item.value}
                className="bg-[#0a0a0a]"
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Nível
          </span>

          <select
            value={level}
            onChange={(event) =>
              setLevel(event.target.value)
            }
            className="w-full rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-black text-white focus:outline-none"
          >
            <option value="">—</option>

            {LEVELS.map((item) => (
              <option
                key={item.value}
                value={item.value}
                className="bg-[#0a0a0a]"
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
              Peso-alvo (kg)
            </span>

            <div className="flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
              <input
                type="text"
                inputMode="decimal"
                value={targetWeight}
                onChange={(event) =>
                  setTargetWeight(event.target.value)
                }
                placeholder="—"
                className="w-full bg-transparent text-sm font-black text-white placeholder:text-zinc-700 focus:outline-none"
              />

              <span className="text-[10px] font-black text-zinc-600">
                kg
              </span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
              Frequência semanal
            </span>

            <div className="flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
              <input
                type="text"
                inputMode="numeric"
                value={weeklyFrequency}
                onChange={(event) =>
                  setWeeklyFrequency(event.target.value)
                }
                placeholder="—"
                className="w-full bg-transparent text-sm font-black text-white placeholder:text-zinc-700 focus:outline-none"
              />

              <span className="text-[10px] font-black text-zinc-600">
                x/sem
              </span>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Observações / meta
          </span>

          <textarea
            value={goalNotes}
            onChange={(event) =>
              setGoalNotes(event.target.value)
            }
            rows={3}
            placeholder="Ex.: perder 5 kg em 3 meses mantendo massa muscular…"
            className="w-full resize-none rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-bold text-white placeholder:text-zinc-700 focus:outline-none"
          />
        </label>

        {error && (
          <p className="rounded-[14px] border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving ? 'Salvando…' : 'Salvar metas'}
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
