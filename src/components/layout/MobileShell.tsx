import { Outlet } from 'react-router-dom';

export function MobileShell() {
  return (
    <div className="min-h-screen bg-vs-dark">
      <div className="max-w-lg mx-auto">
        <Outlet />
      </div>
    </div>
  );
}
