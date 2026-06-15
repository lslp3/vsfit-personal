import { createBrowserRouter, Navigate } from 'react-router-dom';
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
import { NotificationsPage } from '../pages/personal/NotificationsPage';
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
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/:id', element: <StudentProfilePage /> },
      { path: 'workout-builder', element: <WorkoutBuilderPage /> },
      { path: 'exercise-library', element: <ExerciseLibraryPage /> },
      { path: 'nutrition', element: <NutritionPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'financial', element: <FinancialPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'signup-links', element: <SignupLinksPage /> },
      { path: 'reports', element: <ReportsPage /> },
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