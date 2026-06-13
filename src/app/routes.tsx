import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';

import { MobileShell } from '../components/layout/MobileShell';
import { PersonalShell } from '../components/layout/PersonalShell';
import { StudentShell } from '../components/layout/StudentShell';
import { AdminShell } from '../components/layout/AdminShell';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { StudentLoginPage } from '../pages/auth/StudentLoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

import { DashboardPage } from '../pages/personal/DashboardPage';
import { StudentsPage } from '../pages/personal/StudentsPage';
import { StudentProfilePage } from '../pages/personal/StudentProfilePage';
import { WorkoutBuilderPage } from '../pages/personal/WorkoutBuilderPage';
import { ExerciseLibraryPage } from '../pages/personal/ExerciseLibraryPage';
import { NutritionPage } from '../pages/personal/NutritionPage';
import { ProgressPage } from '../pages/personal/ProgressPage';
import { FinancialPage } from '../pages/personal/FinancialPage';
import { ChatPage } from '../pages/personal/ChatPage';
import { SignupLinksPage } from '../pages/personal/SignupLinksPage';
import { ReportsPage } from '../pages/personal/ReportsPage';
import { TrainerProfilePage } from '../pages/personal/TrainerProfilePage';
import { SubscriptionPage } from '../pages/personal/SubscriptionPage';

import { SignupPublicPage } from '../pages/public/SignupPublicPage';

import { StudentHomePage } from '../pages/student/StudentHomePage';
import { StudentWorkoutsPage } from '../pages/student/StudentWorkoutsPage';
import { WorkoutDetailPage } from '../pages/student/WorkoutDetailPage';
import { WorkoutExecutionPage } from '../pages/student/WorkoutExecutionPage';
import { WorkoutCompletedPage } from '../pages/student/WorkoutCompletedPage';
import { StudentProgressPage } from '../pages/student/StudentProgressPage';
import { StudentChatPage } from '../pages/student/StudentChatPage';
import { StudentProfilePage as StudentProfile } from '../pages/student/StudentProfilePage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { TrainersPage } from '../pages/admin/TrainersPage';
import { TrainerApprovalPage } from '../pages/admin/TrainerApprovalPage';
import { AdminSubscriptionsPage } from '../pages/admin/AdminSubscriptionsPage';
import { AdminFinancialPage } from '../pages/admin/AdminFinancialPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';

import { useAuthStore } from '../store/authStore';
import * as subscriptionService from '../services/subscriptionService';
import type { PlanSlug } from '../lib/planLimits';

type PlanGateProps = {
  children: React.ReactNode;
  blockedForFree?: boolean;
  blockedForPro?: boolean;
  title: string;
  description: string;
};

function PlanBlockedScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] border border-yellow-500/25 bg-yellow-500/10 text-yellow-400 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <Lock className="h-11 w-11" />
          <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#ff2a32] text-white">
            <Crown className="h-5 w-5" />
          </div>
        </div>

        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#ff2a32]">
          Recurso premium
        </p>

        <h1 className="text-[28px] font-black uppercase italic leading-tight tracking-tight text-white">
          {title}
        </h1>

        <p className="mt-4 max-w-[320px] text-[14px] font-medium leading-relaxed text-zinc-400">
          {description}
        </p>

        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/personal/dashboard')}
            className="h-14 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black uppercase text-white transition-all active:scale-95"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() => navigate('/personal/subscription')}
            className="h-14 rounded-[20px] bg-[#ff2a32] text-[13px] font-black uppercase text-white shadow-[0_18px_45px_rgba(255,42,48,0.28)] transition-all active:scale-95"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanGate({
  children,
  blockedForFree = false,
  blockedForPro = false,
  title,
  description,
}: PlanGateProps) {
  const { trainerProfile, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [planSlug, setPlanSlug] = useState<PlanSlug>('free');

  useEffect(() => {
    let active = true;

    async function loadPlan() {
      if (!isAuthenticated || !trainerProfile?.id) {
        if (active) {
          setPlanSlug('free');
          setLoading(false);
        }
        return;
      }

      try {
        const currentPlan = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);

        if (active) {
          setPlanSlug(currentPlan);
          setLoading(false);
        }
      } catch (error) {
        console.error('[PlanGate] Erro ao buscar plano:', error);

        if (active) {
          setPlanSlug('free');
          setLoading(false);
        }
      }
    }

    loadPlan();

    return () => {
      active = false;
    };
  }, [isAuthenticated, trainerProfile?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-400">Verificando plano...</p>
        </div>
      </div>
    );
  }

  const isBlocked =
    (blockedForFree && planSlug === 'free') ||
    (blockedForPro && planSlug === 'pro');

  if (isBlocked) {
    return <PlanBlockedScreen title={title} description={description} />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <MobileShell />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'student-login', element: <StudentLoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: '/personal',
    element: <PersonalShell />,
    children: [
      { index: true, element: <Navigate to="/personal/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/:id', element: <StudentProfilePage /> },
      { path: 'workout-builder', element: <WorkoutBuilderPage /> },
      { path: 'exercise-library', element: <ExerciseLibraryPage /> },

      {
        path: 'nutrition',
        element: (
          <PlanGate
            blockedForFree
            title="Nutrição bloqueada"
            description="O módulo de nutrição está disponível nos planos Pro e Premium."
          >
            <NutritionPage />
          </PlanGate>
        ),
      },

      {
        path: 'progress',
        element: (
          <PlanGate
            blockedForFree
            title="Progresso avançado bloqueado"
            description="No plano Free você pode usar alunos, biblioteca e montador de treinos. Para acompanhar evolução avançada, faça upgrade."
          >
            <ProgressPage />
          </PlanGate>
        ),
      },

      {
        path: 'financial',
        element: (
          <PlanGate
            blockedForFree
            title="Financeiro bloqueado"
            description="O financeiro está disponível no plano Pro com recursos básicos e no Premium com recursos avançados."
          >
            <FinancialPage />
          </PlanGate>
        ),
      },

      {
        path: 'chat',
        element: (
          <PlanGate
            blockedForFree
            title="Chat bloqueado"
            description="O chat com alunos está disponível nos planos Pro e Premium."
          >
            <ChatPage />
          </PlanGate>
        ),
      },

      {
        path: 'signup-links',
        element: (
          <PlanGate
            blockedForFree
            title="Captura de alunos bloqueada"
            description="A captação por link está disponível nos planos Pro e Premium. No Free você pode cadastrar apenas 1 aluno manualmente."
          >
            <SignupLinksPage />
          </PlanGate>
        ),
      },

      {
        path: 'reports',
        element: (
          <PlanGate
            blockedForFree
            blockedForPro
            title="Relatórios avançados bloqueados"
            description="Os relatórios avançados são exclusivos do plano Premium."
          >
            <ReportsPage />
          </PlanGate>
        ),
      },

      { path: 'profile', element: <TrainerProfilePage /> },
      { path: 'subscription', element: <SubscriptionPage /> },
    ],
  },
  {
    path: '/signup/:slug',
    element: <SignupPublicPage />,
  },
  {
    path: '/student',
    element: <StudentShell />,
    children: [
      { index: true, element: <Navigate to="/student/home" replace /> },
      { path: 'home', element: <StudentHomePage /> },
      { path: 'workouts', element: <StudentWorkoutsPage /> },
      { path: 'workout-detail/:id', element: <WorkoutDetailPage /> },
      { path: 'workout-execution/:id', element: <WorkoutExecutionPage /> },
      { path: 'workout-completed/:id', element: <WorkoutCompletedPage /> },
      { path: 'progress', element: <StudentProgressPage /> },
      { path: 'chat', element: <StudentChatPage /> },
      { path: 'profile', element: <StudentProfile /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'trainers', element: <TrainersPage /> },
      { path: 'trainer-approval', element: <TrainerApprovalPage /> },
      { path: 'subscriptions', element: <AdminSubscriptionsPage /> },
      { path: 'financial', element: <AdminFinancialPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/auth/login" replace />,
  },
]);