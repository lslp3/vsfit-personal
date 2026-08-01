import type { LucideIcon } from 'lucide-react';

export function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/25 p-2.5">
      <Icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-[#ff2a32]" />

      <p className="text-base font-black">
        {value}
      </p>

      <p className="text-[8px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}
