import { useRef, useState } from 'react';
import {
  Dumbbell,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

type ExerciseMediaCardProps = {
  videoUrl?: string | null;
  imageUrl?: string | null;
  exerciseName: string;
  /** Instruções exibidas no fallback (sem mídia). */
  instructions?: string | null;
  /** Dicas exibidas no fallback (sem mídia). */
  tips?: string | null;
};

/**
 * Card de mídia do exercício (Etapa 6).
 *
 * Comportamento preservado do fluxo atual (vídeo autoplay muted loop
 * playsInline) + controles de play/pause, mute/unmute e um botão para
 * EXPANDIR o player em tela cheia (overlay fixo). Sem mídia, exibe um
 * fallback claro ("Vídeo não disponível") com instruções/dicas do exercício
 * em vez de apenas o ícone.
 */
export function ExerciseMediaCard({
  videoUrl,
  imageUrl,
  exerciseName,
  instructions,
  tips,
}: ExerciseMediaCardProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] =
    useState(true);

  const [isMuted, setIsMuted] =
    useState(true);

  const [expanded, setExpanded] =
    useState(false);

  function togglePlay() {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function toggleMute() {
    const video = videoRef.current;

    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function toggleExpand() {
    setExpanded((wasOpened) => !wasOpened);
  }

  const hasVideo = Boolean(videoUrl);

  const hasImage =
    !hasVideo && Boolean(imageUrl);

  const hasNoMedia =
    !hasVideo && !hasImage;

  const showInstructions =
    hasNoMedia && (instructions || tips);

  return (
    <div>
      <div className="relative h-[240px] overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={videoUrl!}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />
        ) : hasImage ? (
          <img
            src={imageUrl!}
            alt={exerciseName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Dumbbell className="h-8 w-8 text-zinc-600" />
            <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Vídeo não disponível
            </p>
          </div>
        )}

        {!hasNoMedia && (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
            {hasVideo && (
              <>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={toggleExpand}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {showInstructions && (
        <div className="mt-2 space-y-1.5 rounded-[16px] border border-white/10 bg-black/20 p-3 text-left">
          {instructions && (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-300">
              <span className="mt-px font-black uppercase text-[#ff2a32]">
                Instruções
              </span>
              <span>
                {instructions}
              </span>
            </p>
          )}

          {tips && (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-400">
              <span className="mt-px font-black uppercase text-[#ff2a32]">
                Dica
              </span>
              <span>
                {tips}
              </span>
            </p>
          )}
        </div>
      )}

      {expanded && (hasVideo || hasImage) && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/95 p-4">
          {hasVideo ? (
            <video
              src={videoUrl!}
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] w-full object-contain"
              controls
            />
          ) : (
            <img
              src={imageUrl!}
              alt={exerciseName}
              className="max-h-[80vh] w-full object-contain"
            />
          )}

          <button
            type="button"
            onClick={toggleExpand}
            className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}