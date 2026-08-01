import {
  Dumbbell,
  Gauge,
  Timer,
  Weight,
  type LucideIcon,
} from 'lucide-react';

type ExerciseInfoPanelProps = {
  exerciseName: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  tempo?: string | null;
};

/**
 * Painel de informações do exercício (Etapa 6).
 *
 * Recebe somente dados prontos via props e renderiza o nome do
 * exercício + badges com as informações disponíveis (grupo muscular,
 * equipamento, dificuldade e tempo de execução).
 */
export function ExerciseInfoPanel({
  exerciseName,
  muscleGroup,
  equipment,
  difficulty,
  tempo,
}: ExerciseInfoPanelProps) {
  const details: {
    icon: LucideIcon;
    value: string;
  }[] = [];

  if (muscleGroup) {
    details.push({
      icon: Dumbbell,
      value: muscleGroup,
    });
  }

  if (equipment) {
    details.push({
      icon: Weight,
      value: equipment,
    });
  }

  if (difficulty) {
    details.push({
      icon: Gauge,
      value: difficulty,
    });
  }

  if (tempo) {
    details.push({
      icon: Timer,
      value: tempo,
    });
  }

  return (
    <div className="mt-2">
      <h1 className="text-xl font-black">
        {exerciseName}
      </h1>

      {details.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {details.map((detail, index) => (
            <span
              key={`${detail.value}-${index}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-zinc-300"
            >
              <detail.icon className="h-3 w-3 text-[#ff2a32]" />

              {detail.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
