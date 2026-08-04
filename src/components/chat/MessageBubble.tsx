import { Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '../../lib/utils';
import type { Message } from '../../types/database';
import { AvatarWithStatus } from './AvatarWithStatus';
import { MessageImage } from './MessageImage';
import { MessageVideo } from './MessageVideo';
import { MessageAudio } from './MessageAudio';
import { MessageDocument } from './MessageDocument';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Bubble ÚNICO e reutilizável da mensagem do chat (Personal ↔ Aluno).
 * Substitui o bloco duplicado de `ChatPage.tsx` e `StudentChatPage.tsx`
 * (risco R7): layout, avatar, conteúdo por tipo (text/image/video/audio/
 * document), timestamp e check de leitura num único lugar.
 *
 * Props:
 * - msg: linha completa de `messages` (Message);
 * - isOwn: true quando a mensagem é do usuário logado (define alinhamento,
 *   cor e check de leitura);
 * - avatar/name/online: dados do avatar do OUTRO participante (lado esquerdo);
 * - ownAvatarSrc/ownAvatarName: avatar do próprio usuário (lado direito);
 * - animate: usa motion.div (padrão do Aluno) ou div estático (Personal).
 */
interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  avatarSrc?: string | null;
  avatarName?: string;
  avatarOnline?: boolean;
  ownAvatarSrc?: string | null;
  ownAvatarName?: string;
  animate?: boolean;
}

export function MessageBubble({
  msg,
  isOwn,
  avatarSrc,
  avatarName = 'Usuário',
  avatarOnline,
  ownAvatarSrc,
  ownAvatarName = 'Você',
  animate = false,
}: MessageBubbleProps) {
  const isMedia = msg.type !== 'text' && msg.type !== undefined && !!msg.media_url;

  const content = (() => {
    if (!isMedia) {
      return (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {msg.content}
        </p>
      );
    }

    switch (msg.type) {
      case 'image':
        return <MessageImage msg={msg} />;
      case 'video':
        return <MessageVideo msg={msg} />;
      case 'audio':
        return <MessageAudio msg={msg} />;
      case 'document':
      case 'file':
        return <MessageDocument msg={msg} />;
      default:
        return (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {msg.content}
          </p>
        );
    }
  })();

  const body = (
    <div className={cn('flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <AvatarWithStatus
          src={avatarSrc}
          name={avatarName}
          online={avatarOnline}
          size="sm"
          accent
        />
      )}

      <div
        className={cn(
          'max-w-[74%] rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.25)]',
          isMedia
            ? 'rounded-bl-md border border-white/10 bg-white/[0.08] p-2 text-white'
            : isOwn
              ? 'rounded-br-md bg-[#ff2a32] px-4 py-2.5 text-white'
              : 'rounded-bl-md border border-white/10 bg-white/[0.08] px-4 py-2.5 text-white'
        )}
      >
        {content}

        <div
          className={cn(
            'flex items-center gap-1',
            isOwn ? 'justify-end' : 'justify-start',
            isMedia && 'mt-1.5 px-1'
          )}
        >
          <span className="text-[10px] opacity-60">
            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isOwn &&
            (msg.read ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
            ) : (
              <Check className="h-3.5 w-3.5 text-white/60" />
            ))}
        </div>
      </div>

      {isOwn && (
        <AvatarWithStatus
          src={ownAvatarSrc ?? avatarSrc}
          name={ownAvatarName}
          online
          size="sm"
          showStatus={false}
        />
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {body}
      </motion.div>
    );
  }

  return <div>{body}</div>;
}