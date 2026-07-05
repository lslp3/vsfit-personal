import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom';

import { RoleGuard } from '../components/auth/RoleGuard';
import { AdminShell } from '../components/layout/AdminShell';
import { MobileShell } from '../components/layout/MobileShell';
import { PersonalShell } from '../components/layout/PersonalShell';
import { StudentShell } from '../components/layout/StudentShell';

import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { StudentLoginPage } from '../pages/auth/StudentLoginPage';

import LandingPage from '../pages/LandingPage';

import { SignupPublicPage } from '../pages/public/SignupPublicPage';

import { ChatPage } from '../pages/personal/ChatPage';
import { DashboardPage } from '../pages/personal/DashboardPage';
import { ExerciseLibraryPage } from '../pages/personal/ExerciseLibraryPage';
import { FinancialPage } from '../pages/personal/FinancialPage';
import { NotificationsPage } from '../pages/personal/NotificationsPage';
import { NutritionPage } from '../pages/personal/NutritionPage';
import { ProgressPage } from '../pages/personal/ProgressPage';
import { ReportsPage } from '../pages/personal/ReportsPage';
import { SignupLinksPage } from '../pages/personal/SignupLinksPage';
import { StudentProfilePage } from '../pages/personal/StudentProfilePage';
import { StudentsPage } from '../pages/personal/StudentsPage';
import { SubscriptionPage } from '../pages/personal/SubscriptionPage';
import { TrainerProfilePage } from '../pages/personal/TrainerProfilePage';
import { WorkoutBuilderPage } from '../pages/personal/WorkoutBuilderPage';

import { StudentChatPage } from '../pages/student/StudentChatPage';
import { StudentHomePage } from '../pages/student/StudentHomePage';
import {
  NutritionPage as StudentNutritionPage,
} from '../pages/student/NutritionPage';
import {
  StudentProfilePage as StudentProfile,
} from '../pages/student/StudentProfilePage';
import { StudentProgressPage } from '../pages/student/StudentProgressPage';
import { StudentWorkoutsPage } from '../pages/student/StudentWorkoutsPage';
import { WorkoutCompletedPage } from '../pages/student/WorkoutCompletedPage';
import { WorkoutDetailPage } from '../pages/student/WorkoutDetailPage';
import { WorkoutExecutionPage } from '../pages/student/WorkoutExecutionPage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminFinancialPage } from '../pages/admin/AdminFinancialPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';
import { AdminSubscriptionsPage } from '../pages/admin/AdminSubscriptionsPage';
import { TrainerApprovalPage } from '../pages/admin/TrainerApprovalPage';
import { TrainersPage } from '../pages/admin/TrainersPage';

export const router =
  createBrowserRouter([
    {
      path: '/',
      element: <LandingPage />,
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
          path: 'notifications',
          element: <NotificationsPage />,
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
      path: '/public/signup',
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