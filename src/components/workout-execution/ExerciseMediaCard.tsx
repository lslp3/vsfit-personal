import { useRef, useState } from 'react';
import {
  Dumbbell,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

type ExerciseMediaCardProps = {
  videoUrl?: string | null;
  imageUrl?: string | null;
  exerciseName: string;
};

/**
 * Card de mídia do exercício (Etapa 6).
 *
 * Comportamento preservado do fluxo atual (vídeo autoplay muted loop
 * playsInline), com controles básicos adicionais de play/pause e
 * mute/unmute. Sem mídia, exibe o fallback com ícone.
 */
export function ExerciseMediaCard({
  videoUrl,
  imageUrl,
  exerciseName,
}: ExerciseMediaCardProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const [isPlaying, setIsPlaying] =
    useState(true);

  const [isMuted, setIsMuted] =
    useState(true);

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

  return (
    <div className="relative h-[200px] overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
      {videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />

          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
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
          </div>
        </>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={exerciseName}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Dumbbell className="h-10 w-10 text-[#ff2a32]" />
        </div>
      )}
    </div>
  );
}
