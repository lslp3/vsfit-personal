import { Outlet } from 'react-router-dom';

export function MobileShell() {
  return (
    <div className="min-h-screen bg-vs-dark pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-lg mx-auto">
        <Outlet />
      </div>
    </div>
  );
}
