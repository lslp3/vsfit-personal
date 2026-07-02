import { BrandMark } from '../brand/BrandMark';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center">
          <BrandMark
            size="xl"
            className="animate-pulse rounded-[24px]"
          />
        </div>

        <div className="absolute -bottom-2 left-1/2 h-[2px] w-12 -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ff2a32]" />
        </div>
      </div>

      <p className="mt-7 text-sm font-black tracking-[-0.02em] text-white">
        VSFit Personal
      </p>

      <p className="mt-1 text-[11px] font-medium text-zinc-600">
        Preparando seu painel
      </p>
    </div>
  );
}

export default LoadingScreen;