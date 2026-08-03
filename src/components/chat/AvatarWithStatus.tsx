/**
 * Avatar com indicador de status (online/offline) — compartilhado entre o
 * ChatPage do Personal e o StudentChatPage do Aluno.
 * Consolidado na Sprint 10.1.
 *
 * Prop `showStatus` permite ocultar o dot (ex.: avatar do próprio aluno
 * na bolha da mensagem enviada).
 */

import { cn, getInitials } from '../../lib/utils';

export function AvatarWithStatus({
  src,
  name,
  online,
  size = 'md',
  accent = false,
  showStatus = true,
}: {
  src?: string | null;
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
  accent?: boolean;
  showStatus?: boolean;
}) {
  const avatarSize = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const dotSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={cn('relative shrink-0 overflow-visible', avatarSize)}>
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-full border border-white/10',
          accent ? 'bg-[#ff2a32]/10' : 'bg-white/[0.06]'
        )}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center font-black',
              size === 'sm' ? 'text-[11px]' : 'text-sm',
              accent ? 'text-[#ff2a32]' : 'text-zinc-300'
            )}
          >
            {getInitials(name)}
          </span>
        )}
      </div>

      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-[2.5px] border-[#050505]',
            dotSize,
            online ? 'bg-emerald-400' : 'bg-zinc-600'
          )}
        />
      )}
    </div>
  );
}
