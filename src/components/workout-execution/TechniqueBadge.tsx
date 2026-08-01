import { Layers2, Zap } from 'lucide-react';

import type { WorkoutExerciseGroup } from '../../types/database';

export function TechniqueBadge({
  technique,
  group,
  groupOrder,
}: {
  technique: string;
  group: WorkoutExerciseGroup | null;
  groupOrder: number | null;
}) {
  if (
    technique === 'bi_set' ||
    group?.group_type === 'bi_set'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-black text-purple-300">
        <Layers2 className="h-3 w-3" />

        BI-SET • EXERCÍCIO{' '}
        {groupOrder || 1}
      </span>
    );
  }

  if (
    technique === 'drop_set'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-0.5 text-[10px] font-black text-orange-300">
        <Zap className="h-3 w-3" />

        DROP-SET
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff2a32]/20 bg-[#ff2a32]/10 px-2.5 py-0.5 text-[10px] font-black text-[#ff2a32]">
      <Zap className="h-3 w-3" />

      EXERCÍCIO NORMAL
    </span>
  );
}
