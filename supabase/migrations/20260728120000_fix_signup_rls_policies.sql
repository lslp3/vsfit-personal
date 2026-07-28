-- Fix signup RLS policies for self-owned profile records
-- This enables self-service inserts/updates for new users during signup.

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- user_profiles: the newly created auth user can manage only their own profile row
DROP POLICY IF EXISTS user_profiles_self_select ON public.user_profiles;
CREATE POLICY user_profiles_self_select
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS user_profiles_self_insert ON public.user_profiles;
CREATE POLICY user_profiles_self_insert
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles;
CREATE POLICY user_profiles_self_update
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- trainer_profiles: the personal trainer can manage only their own trainer profile row
DROP POLICY IF EXISTS trainer_profiles_self_select ON public.trainer_profiles;
CREATE POLICY trainer_profiles_self_select
  ON public.trainer_profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS trainer_profiles_self_insert ON public.trainer_profiles;
CREATE POLICY trainer_profiles_self_insert
  ON public.trainer_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS trainer_profiles_self_update ON public.trainer_profiles;
CREATE POLICY trainer_profiles_self_update
  ON public.trainer_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Keep the existing student access behavior for trainer profiles, but do not broaden beyond it.
-- This policy remains in place for students to see the trainer profile of their assigned trainer.
DROP POLICY IF EXISTS trainer_profiles_student_view_trainer ON public.trainer_profiles;
CREATE POLICY trainer_profiles_student_view_trainer
  ON public.trainer_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.trainer_id = trainer_profiles.id
        AND s.auth_user_id = auth.uid()
    )
  );

-- subscriptions: the trainer can create and manage only their own subscription row
DROP POLICY IF EXISTS subscriptions_trainer_manage_own ON public.subscriptions;
CREATE POLICY subscriptions_trainer_manage_own
  ON public.subscriptions
  FOR SELECT
  USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS subscriptions_trainer_insert_own ON public.subscriptions;
CREATE POLICY subscriptions_trainer_insert_own
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS subscriptions_trainer_update_own ON public.subscriptions;
CREATE POLICY subscriptions_trainer_update_own
  ON public.subscriptions
  FOR UPDATE
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Keep the existing student-select policy behavior for subscriptions.
DROP POLICY IF EXISTS subscriptions_student_select_own ON public.subscriptions;
CREATE POLICY subscriptions_student_select_own
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.trainer_id = subscriptions.trainer_id
        AND s.auth_user_id = auth.uid()
    )
  );
