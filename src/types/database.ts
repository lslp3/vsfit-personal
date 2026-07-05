import type { PlanSlug } from '../lib/planLimits';

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkoutTechniqueType =
  | 'normal'
  | 'drop_set'
  | 'bi_set';

export type WorkoutRenewalStatus =
  | 'none'
  | 'renewed';

export interface DropSetConfig {
  drops?: number;
  reduction_percent?: number;
  rest_between_drops_seconds?: number;
  notes?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'personal' | 'student';
  created_at: string;
  updated_at: string;
}

export interface TrainerProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  cref: string | null;
  cref_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  cref_submitted_at: string | null;
  cref_verified_at: string | null;
  cref_rejection_reason: string | null;
  instagram: string | null;
  location: string | null;
  niche: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  trainer_id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'paused';
  app_access_status: 'no_access' | 'invited' | 'active' | 'blocked';
  login_enabled: boolean;
  created_at: string;
  updated_at: string;
  student_accounts?: StudentAccount[];
}

export interface StudentAccount {
  id: string;
  student_id: string;
  auth_user_id: string | null;
  email: string;
  temporary_password: string | null;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentGoals {
  id: string;
  student_id: string;
  objective: string | null;
  goal_notes: string | null;
  level: string | null;
  weekly_frequency: number | null;
  target_weight: number | null;
  goal_deadline_weeks: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentMetrics {
  id: string;
  student_id: string;
  date: string;
  height: number | null;
  weight: number | null;
  body_fat: number | null;
  target_body_fat: number | null;
  muscle_mass: number | null;
  water_intake: number | null;
  notes: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  trainer_id: string | null;
  name: string;
  muscle_group: string | null;
  category: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  tips: string | null;
  image_url: string | null;
  video_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlan {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  objective: string | null;
  level: string | null;
  duration_minutes: number | null;
  status: 'draft' | 'published' | 'archived';

  start_date: string | null;
  end_date: string | null;
  renewal_status: WorkoutRenewalStatus | string | null;
  renewed_from_plan_id: string | null;
  renewal_created_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface WorkoutDay {
  id: string;
  workout_plan_id: string;
  weekday: number | null;
  day_key: string | null;
  order_index: number;
  name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseGroup {
  id: string;
  workout_day_id: string;
  workout_plan_id: string;
  group_type: 'bi_set' | string;
  name: string | null;
  order_index: number;
  rounds: number | null;
  rest_after_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlanExercise {
  id: string;
  workout_plan_id: string;
  exercise_id: string | null;

  workout_day_id: string | null;
  exercise_group_id: string | null;

  day_key: string | null;
  order_index: number;
  execution_order: number | null;
  group_order: number | null;

  technique_type: WorkoutTechniqueType | null;
  technique_config: DropSetConfig | JsonValue | null;

  name: string;
  sets: string | null;
  reps: string | null;
  rest_seconds: number | null;
  suggested_weight: string | null;
  observation: string | null;
  tempo: string | null;

  image_url?: string | null;
  video_url?: string | null;
  muscle_group?: string | null;
  category?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
  tips?: string | null;

  created_at: string;
  updated_at?: string | null;
}

export interface CompleteWorkoutPlan extends WorkoutPlan {
  workout_days: WorkoutDay[];
  workout_exercise_groups: WorkoutExerciseGroup[];
  workout_plan_exercises: WorkoutPlanExercise[];
}

export interface WorkoutLog {
  id: string;
  student_id: string;
  trainer_id: string;
  workout_plan_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  status: string;
  exercises_data: ExerciseRecord[];
  notes: string | null;
  created_at: string;
}

export interface ExerciseRecord {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_used: string;
}

export interface Payment {
  id: string;
  trainer_id: string;
  student_id: string | null;
  student_name: string | null;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  method: string | null;
  description: string | null;
  pix_key: string | null;
  pix_code: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  trainer_id: string;
  student_id: string;
  sender_role: 'personal' | 'student';
  sender_id: string;
  content: string;
  type: string;
  media_url: string | null;
  read: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  trainer_id: string;
  plan_slug: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  slug: PlanSlug;
  name: string;
  price_monthly: number;
  student_limit: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface SignupLink {
  id: string;
  trainer_id: string;
  title: string | null;
  slug: string;
  message: string | null;
  is_active: boolean;
  plan_name: string | null;
  visits_count: number | null;
  created_at: string;
}

export interface SignupLead {
  id: string;
  signup_link_id: string | null;
  trainer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  goal: string | null;
  message: string | null;
  status: string;
  converted_student_id: string | null;
  converted_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
}