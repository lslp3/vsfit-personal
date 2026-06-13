import { Dumbbell } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-vs-dark flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-vs-primary/20 flex items-center justify-center animate-pulse">
          <Dumbbell className="w-8 h-8 text-vs-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-vs-primary animate-ping" />
      </div>
      <p className="mt-4 text-vs-muted text-sm font-medium">VSFit Personal</p>
    </div>
  );
}
