import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import type { UserProfile } from '../../types/database';

type AppRole = UserProfile['role'];

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

function getHomeByRole(role?: AppRole | null) {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'personal') {
    return '/personal/dashboard';
  }

  if (role === 'student') {
    return '/student/home';
  }

  return '/auth/login';
}

export function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const location = useLocation();

  const {
    user,
    profile,
    student,
    isLoading,
    isAuthenticated,
  } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              Verificando acesso...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Aguarde um instante.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    !user ||
    !isAuthenticated
  ) {
    const loginPath = allowedRoles.includes('student')
      ? '/auth/student-login'
      : '/auth/login';

    return (
      <Navigate
        to={loginPath}
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const resolvedRole: AppRole | null =
    profile?.role ||
    (student?.id ? 'student' : null);

  if (!resolvedRole) {
    return (
      <Navigate
        to="/auth/login"
        replace
      />
    );
  }

  if (!allowedRoles.includes(resolvedRole)) {
    return (
      <Navigate
        to={getHomeByRole(resolvedRole)}
        replace
      />
    );
  }

  return <>{children}</>;
}

export default RoleGuard;