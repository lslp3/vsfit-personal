import { useState } from 'react';
import {
  Loader2,
  Ruler,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  deleteStudentMetric,
  saveStudentMetric,
} from '../../services/progressService';
import type { StudentMetricRecord } from '../../services/progressService';

interface AssessmentModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  /** Avaliação existente para edição (null = nova avaliação). */
  metric?: StudentMetricRecord | null;
  onSaved: () => void;
}

const CIRCUMFERENCE_FIELDS: Array<{
  key: keyof Pick<
    StudentMetricRecord,
    | 'arm_cm'
    | 'chest_cm'
    | 'waist_cm'
    | 'abdomen_cm'
    | 'hips_cm'
    | 'thigh_cm'
    | 'calf_cm'
  >;
  label: string;
}> = [
  { key: 'arm_cm', label: 'Braço' },
  { key: 'chest_cm', label: 'Peito' },
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'abdomen_cm', label: 'Abdômen' },
  { key: 'hips_cm', label: 'Quadril' },
  { key: 'thigh_cm', label: 'Coxa' },
  { key: 'calf_cm', label: 'Panturrilha' },
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

function NumberField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
        {label}
      </span>

      <div className="flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="—"
          className="w-full bg-transparent text-sm font-black text-white placeholder:text-zinc-700 focus:outline-none"
        />

        {unit && (
          <span className="text-[10px] font-black text-zinc-600">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

export function AssessmentModal({
  open,
  onClose,
  studentId,
  metric,
  onSaved,
}: AssessmentModalProps) {
  const isEditing = Boolean(metric);

  const [date, setDate] = useState(
    metric?.date ||
      new Date().toISOString().slice(0, 10)
  );
  const [weight, setWeight] = useState(
    toNumberField(metric?.weight)
  );
  const [height, setHeight] = useState(
    toNumberField(metric?.height)
  );
  const [bodyFat, setBodyFat] = useState(
    toNumberField(metric?.body_fat)
  );
  const [muscleMass, setMuscleMass] = useState(
    toNumberField(metric?.muscle_mass)
  );
  const [circumferences, setCircumferences] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      CIRCUMFERENCE_FIELDS.map((field) => [
        field.key,
        toNumberField(metric?.[field.key]),
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      await saveStudentMetric(
        {
          studentId,
          date: date || undefined,
          weight: fromNumberField(weight),
          height: fromNumberField(height),
          body_fat: fromNumberField(bodyFat),
          muscle_mass: fromNumberField(muscleMass),
          arm_cm: fromNumberField(
            circumferences.arm_cm
          ),
          chest_cm: fromNumberField(
            circumferences.chest_cm
          ),
          waist_cm: fromNumberField(
            circumferences.waist_cm
          ),
          abdomen_cm: fromNumberField(
            circumferences.abdomen_cm
          ),
          hips_cm: fromNumberField(
            circumferences.hips_cm
          ),
          thigh_cm: fromNumberField(
            circumferences.thigh_cm
          ),
          calf_cm: fromNumberField(
            circumferences.calf_cm
          ),
        },
        metric?.id
      );

      onSaved();
    } catch (saveError) {
      const message =
        (saveError as { message?: string } | null)?.message ??
        (saveError as { error?: { message?: string } } | null)
          ?.error?.message ??
        (saveError as { details?: string } | null)?.details ??
        'Erro ao salvar avaliação.';

      const code = (
        saveError as { code?: string } | null
      )?.code;

      setError(
        code
          ? `Erro ao salvar avaliação.\nCódigo: ${code}\nMensagem: ${message}`
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!metric) return;
    setError('');
    setSaving(true);

    try {
      await deleteStudentMetric(metric.id);
      onSaved();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir avaliação.'
      );
      setSaving(false);
    }
  };

  const setCircumference = (
    key: string,
    value: string
  ) => {
    setCircumferences((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar avaliação' : 'Nova avaliação'}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Data
          </span>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="w-full rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-black text-white focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Peso"
            value={weight}
            onChange={setWeight}
            unit="kg"
          />

          <NumberField
            label="Altura"
            value={height}
            onChange={setHeight}
            unit="m"
          />

          <NumberField
            label="Gordura"
            value={bodyFat}
            onChange={setBodyFat}
            unit="%"
          />

          <NumberField
            label="Massa muscular"
            value={muscleMass}
            onChange={setMuscleMass}
            unit="kg"
          />
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#ff2a32]" />

            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
              Medidas corporais (cm)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CIRCUMFERENCE_FIELDS.map((field) => (
              <NumberField
                key={field.key}
                label={field.label}
                value={
                  circumferences[field.key] || ''
                }
                onChange={(value) =>
                  setCircumference(field.key, value)
                }
                unit="cm"
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-[14px] border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? 'Salvando…'
              : isEditing
                ? 'Salvar alterações'
                : 'Salvar avaliação'}
          </Button>

          {isEditing && (
            <Button
              onClick={() =>
                confirmDelete
                  ? handleDelete()
                  : setConfirmDelete(true)
              }
              disabled={saving}
              variant="ghost"
              className={cn(
                'flex items-center gap-2',
                confirmDelete &&
                  'border-red-500/40 bg-red-500/10 text-red-300'
              )}
            >
              {confirmDelete ? (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirmar
                </>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}

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
