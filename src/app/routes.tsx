import { lazy, Suspense, type ComponentType } from 'react';
import {
  createBrowserRouter,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { RoleGuard } from '../components/auth/RoleGuard';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

import { reloadForStaleChunk } from '../utils/chunkReload';

function lazyPage<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(() =>
    loader().catch((error: unknown) =>
      reloadForStaleChunk(error)
        ? new Promise<{ default: T }>(() => {})
        : Promise.reject(error)
    )
  );

  return function LazyPage(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const AdminShell = lazyPage(() =>
  import('../components/layout/AdminShell').then((m) => ({ default: m.AdminShell }))
);

const MobileShell = lazyPage(() =>
  import('../components/layout/MobileShell').then((m) => ({ default: m.MobileShell }))
);

const PersonalShell = lazyPage(() =>
  import('../components/layout/PersonalShell').then((m) => ({ default: m.PersonalShell }))
);

const StudentShell = lazyPage(() =>
  import('../components/layout/StudentShell').then((m) => ({ default: m.StudentShell }))
);

const LandingPage = lazyPage(() =>
  import('../pages/LandingPage').then((m) => ({ default: m.default }))
);

const ForgotPasswordPage = lazyPage(() =>
  import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);

const LoginPage = lazyPage(() =>
  import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);

const RegisterPage = lazyPage(() =>
  import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);

const ResetPasswordPage = lazyPage(() =>
  import('../pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);

const StudentLoginPage = lazyPage(() =>
  import('../pages/auth/StudentLoginPage').then((m) => ({ default: m.StudentLoginPage }))
);

const StudentEntryPage = lazyPage(() =>
  import('../pages/auth/StudentEntryPage').then((m) => ({ default: m.StudentEntryPage }))
);

const SignupPublicPage = lazyPage(() =>
  import('../pages/public/SignupPublicPage').then((m) => ({ default: m.SignupPublicPage }))
);

const ChatPage = lazyPage(() =>
  import('../pages/personal/ChatPage').then((m) => ({ default: m.ChatPage }))
);

const DashboardPage = lazyPage(() =>
  import('../pages/personal/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);

const AnalyticsPage = lazyPage(() =>
  import('../pages/personal/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);

const ExerciseLibraryPage = lazyPage(() =>
  import('../pages/personal/ExerciseLibraryPage').then((m) => ({ default: m.ExerciseLibraryPage }))
);

const FinancialPage = lazyPage(() =>
  import('../pages/personal/FinancialPage').then((m) => ({ default: m.FinancialPage }))
);

const NotificationsPage = lazyPage(() =>
  import('../pages/personal/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);

const PushPreferencesPage = lazyPage(() =>
  import('../pages/personal/PushPreferencesPage').then((m) => ({ default: m.PushPreferencesPage }))
);

const NutritionPage = lazyPage(() =>
  import('../pages/personal/NutritionPage').then((m) => ({ default: m.NutritionPage }))
);

const ProgressPage = lazyPage(() =>
  import('../pages/personal/ProgressPage').then((m) => ({ default: m.ProgressPage }))
);

const ReportsPage = lazyPage(() =>
  import('../pages/personal/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);

const SignupLinksPage = lazyPage(() =>
  import('../pages/personal/SignupLinksPage').then((m) => ({ default: m.SignupLinksPage }))
);

const StudentProfilePage = lazyPage(() =>
  import('../pages/personal/StudentProfilePage').then((m) => ({ default: m.StudentProfilePage }))
);

const StudentsPage = lazyPage(() =>
  import('../pages/personal/StudentsPage').then((m) => ({ default: m.StudentsPage }))
);

const SubscriptionPage = lazyPage(() =>
  import('../pages/personal/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage }))
);

const TrainerProfilePage = lazyPage(() =>
  import('../pages/personal/TrainerProfilePage').then((m) => ({ default: m.TrainerProfilePage }))
);

const WorkoutBuilderPage = lazyPage(() =>
  import('../pages/personal/WorkoutBuilderPage').then((m) => ({ default: m.WorkoutBuilderPage }))
);

const StudentChatPage = lazyPage(() =>
  import('../pages/student/StudentChatPage').then((m) => ({ default: m.StudentChatPage }))
);

const StudentNotificationsPage = lazyPage(() =>
  import('../pages/student/StudentNotificationsPage').then((m) => ({
    default: m.StudentNotificationsPage,
  }))
);

const StudentHomePage = lazyPage(() =>
  import('../pages/student/StudentHomePage').then((m) => ({ default: m.StudentHomePage }))
);

const StudentNutritionPage = lazyPage(() =>
  import('../pages/student/NutritionPage').then((m) => ({ default: m.NutritionPage }))
);

const StudentProfile = lazyPage(() =>
  import('../pages/student/StudentProfilePage').then((m) => ({ default: m.StudentProfilePage }))
);

const StudentProgressPage = lazyPage(() =>
  import('../pages/student/StudentProgressPage').then((m) => ({ default: m.StudentProgressPage }))
);

const StudentWorkoutsPage = lazyPage(() =>
  import('../pages/student/StudentWorkoutsPage').then((m) => ({ default: m.StudentWorkoutsPage }))
);

const WorkoutCompletedPage = lazyPage(() =>
  import('../pages/student/WorkoutCompletedPage').then((m) => ({ default: m.WorkoutCompletedPage }))
);

const WorkoutDetailPage = lazyPage(() =>
  import('../pages/student/WorkoutDetailPage').then((m) => ({ default: m.WorkoutDetailPage }))
);

const WorkoutExecutionPage = lazyPage(() =>
  import('../pages/student/WorkoutExecutionPage').then((m) => ({ default: m.WorkoutExecutionPage }))
);

const AdminDashboardPage = lazyPage(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const AdminFinancialPage = lazyPage(() =>
  import('../pages/admin/AdminFinancialPage').then((m) => ({ default: m.AdminFinancialPage }))
);

const AdminReportsPage = lazyPage(() =>
  import('../pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);

const AdminSubscriptionsPage = lazyPage(() =>
  import('../pages/admin/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage }))
);

const TrainerApprovalPage = lazyPage(() =>
  import('../pages/admin/TrainerApprovalPage').then((m) => ({ default: m.TrainerApprovalPage }))
);

const TrainersPage = lazyPage(() =>
  import('../pages/admin/TrainersPage').then((m) => ({ default: m.TrainersPage }))
);

function getHomeByRole(role?: string | null) {
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

function isRecoveryRedirect(location: { search: string; hash: string }) {
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));

  return (
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    Boolean(searchParams.get('token_hash')) ||
    Boolean(hashParams.get('token_hash')) ||
    Boolean(hashParams.get('access_token')) ||
    Boolean(hashParams.get('refresh_token'))
  );
}

function AuthAwareLandingPage() {
  const location = useLocation();
  const {
    isLoading,
    isAuthenticated,
    isRecovering,
    profile,
    student,
  } = useAuthStore();

  const { chosenRole } = useOnboardingStore();

  // Sprint 17 · ETAPA 6 — fluxo Aluno: quem escolheu "Sou Aluno" no onboarding
  // (e ainda não tem sessão) entra direto pela tela de código do Personal —
  // reutilizando o fluxo de convite existente (slug do link de cadastro).
  // Nenhum efeito para usuários existentes ou para quem escolheu Personal.
  if (!isAuthenticated && !isLoading && chosenRole === 'student') {
    return <Navigate to="/auth/student-entry" replace />;
  }

  if (isRecovering) {
    return <Navigate to="/auth/reset-password" replace />;
  }

  if (isRecoveryRedirect(location)) {
    return <Navigate to={`/auth/reset-password${location.search}${location.hash}`} replace />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Sprint 17 · ETAPA 4 — fluxo Personal: quem escolheu "Sou Personal
  // Trainer" no onboarding (e ainda não tem sessão) vai para o login/cadastro
  // do Personal em vez da landing genérica. Ao concluir a autenticação, cai
  // no gate de setup (perfil novo → TrainerFirstSetupPage, configurado →
  // Dashboard). Usuários existentes, signup público e recovery continuam
  // intocados (a lógica segue abaixo, respectivamente).
  if (!isAuthenticated && chosenRole === 'personal') {
    return <Navigate to="/auth/login" replace />;
  }

  if (isAuthenticated) {
    const home = getHomeByRole(
      profile?.role || (student?.id ? 'student' : null)
    );

    return <Navigate to={home} replace />;
  }

  return <LandingPage />;
}

/**
 * Rota raiz: landing autenticada (ou login) conforme o estado de auth.
 */
function RootRoute() {
  return <AuthAwareLandingPage />;
}

export const router =
  createBrowserRouter([
    {
      path: '/',
      element: <RootRoute />,
    },

    {
      path: '/auth/reset-password',
      element: <ResetPasswordPage />,
    },

    {
      path: '/auth',
      element: <MobileShell />,
      children: [
        {
          index: true,
          element: (
            <Navigate
              to="/auth/login"
              replace
            />
          ),
        },
        {
          path: 'login',
          element: <LoginPage />,
        },
        {
          path: 'register',
          element: <RegisterPage />,
        },
        {
          path: 'student-login',
          element: <StudentLoginPage />,
        },
        {
          path: 'student-entry',
          element: <StudentEntryPage />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPasswordPage />,
        },
      ],
    },

    {
      path: '/personal',
      element: (
        <RoleGuard
          allowedRoles={['personal']}
        >
          <PersonalShell />
        </RoleGuard>
      ),
      children: [
        {
          index: true,
          element: (
            <Navigate
              to="/personal/dashboard"
              replace
            />
          ),
        },
        {
          path: 'dashboard',
          element: <DashboardPage />,
        },
        {
          path: 'analytics',
          element: <AnalyticsPage />,
        },
        {
          path: 'notifications',
          element: <NotificationsPage />,
        },
        {
          path: 'push-preferences',
          element: <PushPreferencesPage />,
        },
        {
          path: 'students',
          element: <StudentsPage />,
        },
        {
          path: 'students/:id',
          element: <StudentProfilePage />,
        },
        {
          path: 'workout-builder',
          element: <WorkoutBuilderPage />,
        },
        {
          path: 'exercise-library',
          element: <ExerciseLibraryPage />,
        },
        {
          path: 'nutrition',
          element: <NutritionPage />,
        },
        {
          path: 'progress',
          element: <ProgressPage />,
        },
        {
          path: 'financial',
          element: <FinancialPage />,
        },
        {
          path: 'chat',
          element: <ChatPage />,
        },
        {
          path: 'chat/:studentId',
          element: <ChatPage />,
        },
        {
          path: 'signup-links',
          element: <SignupLinksPage />,
        },
        {
          path: 'reports',
          element: <ReportsPage />,
        },
        {
          path: 'profile',
          element: <TrainerProfilePage />,
        },
        {
          path: 'trainer-profile',
          element: <TrainerProfilePage />,
        },
        {
          path: 'subscription',
          element: <SubscriptionPage />,
        },
      ],
    },

    {
      path: '/student',
      element: (
        <RoleGuard
          allowedRoles={['student']}
        >
          <StudentShell />
        </RoleGuard>
      ),
      children: [
        {
          index: true,
          element: (
            <Navigate
              to="/student/home"
              replace
            />
          ),
        },
        {
          path: 'home',
          element: <StudentHomePage />,
        },
        {
          path: 'workouts',
          element: <StudentWorkoutsPage />,
        },
        {
          path: 'workout-detail/:id',
          element: <WorkoutDetailPage />,
        },
        {
          path: 'workout-execution/:id',
          element: <WorkoutExecutionPage />,
        },
        {
          path: 'workout-completed/:id',
          element: <WorkoutCompletedPage />,
        },
        {
          path: 'progress',
          element: <StudentProgressPage />,
        },
        {
          path: 'nutrition',
          element: <StudentNutritionPage />,
        },
        {
          path: 'chat',
          element: <StudentChatPage />,
        },
        {
          path: 'notifications',
          element: <StudentNotificationsPage />,
        },
        {
          path: 'profile',
          element: <StudentProfile />,
        },
        {
          path: 'profile/:id',
          element: <StudentProfile />,
        },
      ],
    },

    {
      path: '/admin',
      element: (
        <RoleGuard
          allowedRoles={['admin']}
        >
          <AdminShell />
        </RoleGuard>
      ),
      children: [
        {
          index: true,
          element: (
            <Navigate
              to="/admin/dashboard"
              replace
            />
          ),
        },
        {
          path: 'dashboard',
          element: <AdminDashboardPage />,
        },
        {
          path: 'trainers',
          element: <TrainersPage />,
        },
        {
          path: 'trainers/:id/approve',
          element: <TrainerApprovalPage />,
        },
        {
          path: 'subscriptions',
          element: <AdminSubscriptionsPage />,
        },
        {
          path: 'financial',
          element: <AdminFinancialPage />,
        },
        {
          path: 'reports',
          element: <AdminReportsPage />,
        },
      ],
    },

    {
      path: '/signup/:slug',
      element: <SignupPublicPage />,
    },

    {
      path: '*',
      element: (
        <Navigate
          to="/"
          replace
        />
      ),
    },
  ]);

export default router;
