-- ==============================================================================
-- VSFit Personal — MIGRATION DEFINITIVA DE RLS
-- ==============================================================================
--
-- BASEADA NO INVENTÁRIO REAL DO BANCO (47 tabelas analisadas):
--   × 26 tabelas ATIVAS (com código TypeScript + services)
--   × 15 tabelas LEGADAS (dados históricos, policies preservadas)
--   ×  7 tabelas ABANDONADAS (sem código, sem policies — NÃO cobertas)
--
-- MÓDULOS:
--   0. is_admin() function
--   1. CORE: user_profiles, trainer_profiles, students
--   2. STUDENT: student_goals, student_metrics, student_accounts
--   3. WORKOUT: workout_plans, workout_days, workout_exercise_groups,
--               workout_plan_exercises, workout_logs
--   4. EXERCISES: exercises
--   5. MESSAGES: messages
--   6. NOTIFICATIONS: notifications
--   7. PAYMENTS: payments, trainer_payment_settings, subscription_plans,
--                subscriptions
--   8. PLATFORM: platform_subscription_payments, platform_webhook_events,
--                subscription_checkout_attempts
--   9. SIGNUP: coach_signup_links, signup_leads
--  10. PROGRESS: progress_photos, app_presence
--  11. LEGACY SIGNUP: signup_links, signup_link_visits
--  12. LEGACY DATA: support_tickets, support_messages, chat_messages
--  13. LEGACY HISTÓRICO: student_payments, student_progress,
--       student_progress_photos, student_achievements, student_milestones,
--       biometric_history, body_measurements, historical_metrics,
--       subscription_events, appointments, nutrition_plans
--
-- PRINCÍPIO:
--   Toda coluna UUID comparada com UUID (auth.uid() ou outra uuid).
--   Toda coluna TEXT comparada com TEXT (auth.uid()::text).
--   Nunca uuid = text sem cast.
--   Nunca text = uuid sem cast.
--   Sempre s.id::text = tabela_legada.student_id quando student_id é TEXT.
--   Sempre auth.uid()::text = coluna_text quando coluna é TEXT.
--
-- ==============================================================================

-- ==============================================================================
-- MÓDULO 0: is_admin() function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;


-- ==============================================================================
-- MÓDULO 1: CORE
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1a. user_profiles
-- Colunas: id (uuid PK), email (text), name (text?),
--          role (text: admin|personal|student), created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS user_profiles_self_select ON public.user_profiles;
    DROP POLICY IF EXISTS user_profiles_self_insert ON public.user_profiles;
    DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles;
    DROP POLICY IF EXISTS user_profiles_admin_all ON public.user_profiles;
    DROP POLICY IF EXISTS user_profiles_student_view_trainer ON public.user_profiles;

    CREATE POLICY user_profiles_self_select ON public.user_profiles
      FOR SELECT USING (id = auth.uid());

    CREATE POLICY user_profiles_self_insert ON public.user_profiles
      FOR INSERT WITH CHECK (id = auth.uid());

    CREATE POLICY user_profiles_self_update ON public.user_profiles
      FOR UPDATE USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    CREATE POLICY user_profiles_admin_all ON public.user_profiles
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());

    -- Permite que alunos vejam o perfil do personal trainer (via subquery em students)
    CREATE POLICY user_profiles_student_view_trainer ON public.user_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.trainer_profiles tp
          WHERE tp.id = user_profiles.id
            AND EXISTS (
              SELECT 1 FROM public.students s
              WHERE s.trainer_id = tp.id
                AND s.auth_user_id = auth.uid()
            )
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1b. trainer_profiles
-- Colunas: id (uuid PK, = auth.uid()), email (text), name (text),
--          phone, avatar_url, bio, cref, cref_status, …
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trainer_profiles') THEN
    ALTER TABLE IF EXISTS public.trainer_profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS trainer_profiles_self_select ON public.trainer_profiles;
    DROP POLICY IF EXISTS trainer_profiles_self_insert ON public.trainer_profiles;
    DROP POLICY IF EXISTS trainer_profiles_self_update ON public.trainer_profiles;
    DROP POLICY IF EXISTS trainer_profiles_admin_all ON public.trainer_profiles;
    DROP POLICY IF EXISTS trainer_profiles_student_view_trainer ON public.trainer_profiles;
    DROP POLICY IF EXISTS trainer_profiles_public_signup_read ON public.trainer_profiles;

    -- Próprio trainer
    CREATE POLICY trainer_profiles_self_select ON public.trainer_profiles
      FOR SELECT USING (id = auth.uid());

    CREATE POLICY trainer_profiles_self_insert ON public.trainer_profiles
      FOR INSERT WITH CHECK (id = auth.uid());

    CREATE POLICY trainer_profiles_self_update ON public.trainer_profiles
      FOR UPDATE USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    -- Aluno vê perfil do seu trainer
    CREATE POLICY trainer_profiles_student_view_trainer ON public.trainer_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.trainer_id = trainer_profiles.id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Público vê perfil do trainer via signup link ativo (sem referência a students)
    CREATE POLICY trainer_profiles_public_signup_read ON public.trainer_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.coach_signup_links csl
          WHERE csl.coach_auth_user_id = trainer_profiles.id
            AND csl.is_active = true
        )
      );

    -- Admin irrestrito
    CREATE POLICY trainer_profiles_admin_all ON public.trainer_profiles
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1c. students
-- Colunas: id (uuid PK), trainer_id (uuid FK -> trainer_profiles.id),
--          auth_user_id (uuid?, nullable = auth.uid()),
--          name (text), email (text), …
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS students_self_select ON public.students;
    DROP POLICY IF EXISTS students_self_update ON public.students;
    DROP POLICY IF EXISTS students_trainer_select ON public.students;
    DROP POLICY IF EXISTS students_trainer_insert ON public.students;
    DROP POLICY IF EXISTS students_trainer_update ON public.students;
    DROP POLICY IF EXISTS students_trainer_delete ON public.students;
    DROP POLICY IF EXISTS students_admin_all ON public.students;

    -- Aluno vê apenas o próprio registro
    CREATE POLICY students_self_select ON public.students
      FOR SELECT USING (auth_user_id = auth.uid());

    -- Trainer vê seus próprios alunos
    CREATE POLICY students_trainer_select ON public.students
      FOR SELECT USING (trainer_id = auth.uid());

    -- Trainer gerencia alunos
    CREATE POLICY students_trainer_insert ON public.students
      FOR INSERT WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY students_trainer_update ON public.students
      FOR UPDATE USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY students_trainer_delete ON public.students
      FOR DELETE USING (trainer_id = auth.uid());

    -- Aluno pode atualizar campos próprios
    CREATE POLICY students_self_update ON public.students
      FOR UPDATE USING (auth_user_id = auth.uid())
      WITH CHECK (auth_user_id = auth.uid());

    -- Admin irrestrito
    CREATE POLICY students_admin_all ON public.students
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 2: STUDENT DATA
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 2a. student_goals
-- Colunas: id (uuid PK), student_id (uuid FK -> students.id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_goals') THEN
    ALTER TABLE IF EXISTS public.student_goals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_goals_self_select ON public.student_goals;
    DROP POLICY IF EXISTS student_goals_self_insert ON public.student_goals;
    DROP POLICY IF EXISTS student_goals_trainer_all ON public.student_goals;
    DROP POLICY IF EXISTS student_goals_admin_all ON public.student_goals;

    -- Aluno vê as próprias metas
    CREATE POLICY student_goals_self_select ON public.student_goals
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_goals.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_goals_self_insert ON public.student_goals
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_goals.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer gerencia metas dos alunos
    CREATE POLICY student_goals_trainer_all ON public.student_goals
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_goals.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_goals.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY student_goals_admin_all ON public.student_goals
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2b. student_metrics
-- Colunas: id (uuid PK), student_id (uuid FK -> students.id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_metrics') THEN
    ALTER TABLE IF EXISTS public.student_metrics ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_metrics_self_select ON public.student_metrics;
    DROP POLICY IF EXISTS student_metrics_trainer_all ON public.student_metrics;
    DROP POLICY IF EXISTS student_metrics_admin_all ON public.student_metrics;

    CREATE POLICY student_metrics_self_select ON public.student_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_metrics.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_metrics_trainer_all ON public.student_metrics
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_metrics.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_metrics.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_metrics_admin_all ON public.student_metrics
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2c. student_accounts
-- Colunas: id (uuid PK), student_id (uuid FK -> students.id),
--          auth_user_id (uuid?), trainer_id (uuid),
--          email (text)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_accounts') THEN
    ALTER TABLE IF EXISTS public.student_accounts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_accounts_select_own ON public.student_accounts;
    DROP POLICY IF EXISTS student_accounts_update_own_student ON public.student_accounts;
    DROP POLICY IF EXISTS student_accounts_insert_own_student ON public.student_accounts;
    DROP POLICY IF EXISTS student_accounts_delete_own_student ON public.student_accounts;

    -- Leitura: admin, trainer associado, próprio aluno (via auth_user_id ou via students)
    CREATE POLICY student_accounts_select_own ON public.student_accounts
      FOR SELECT USING (
        is_admin()
        OR trainer_id = auth.uid()
        OR auth_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_accounts.student_id
            AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
      );

    -- Atualização: admin, trainer, próprio aluno, ou por email
    CREATE POLICY student_accounts_update_own_student ON public.student_accounts
      FOR UPDATE USING (
        is_admin()
        OR trainer_id = auth.uid()
        OR auth_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_accounts.student_id
            AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
      ) WITH CHECK (
        is_admin()
        OR trainer_id = auth.uid()
        OR auth_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_accounts.student_id
            AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
      );

    -- Inserção: admin ou trainer
    CREATE POLICY student_accounts_insert_own_student ON public.student_accounts
      FOR INSERT WITH CHECK (
        is_admin()
        OR trainer_id = auth.uid()
      );

    -- Exclusão: admin ou trainer
    CREATE POLICY student_accounts_delete_own_student ON public.student_accounts
      FOR DELETE USING (
        is_admin()
        OR trainer_id = auth.uid()
      );
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 3: WORKOUT
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 3a. workout_plans
-- Colunas: id (uuid PK), trainer_id (uuid), student_id (uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_plans') THEN
    ALTER TABLE IF EXISTS public.workout_plans ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workout_plans_student_select ON public.workout_plans;
    DROP POLICY IF EXISTS workout_plans_student_select_own ON public.workout_plans;
    DROP POLICY IF EXISTS workout_plans_trainer_all ON public.workout_plans;
    DROP POLICY IF EXISTS workout_plans_admin_all ON public.workout_plans;

    -- Aluno vê seus planos
    CREATE POLICY workout_plans_student_select ON public.workout_plans
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_plans.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer gerencia planos
    CREATE POLICY workout_plans_trainer_all ON public.workout_plans
      FOR ALL USING (trainer_id = auth.uid() OR is_admin())
      WITH CHECK (trainer_id = auth.uid() OR is_admin());

    -- Admin irrestrito
    CREATE POLICY workout_plans_admin_all ON public.workout_plans
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3b. workout_days
-- Colunas: id (uuid PK), workout_plan_id (uuid FK -> workout_plans.id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_days') THEN
    ALTER TABLE IF EXISTS public.workout_days ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workout_days_student_select ON public.workout_days;
    DROP POLICY IF EXISTS workout_days_student_select_own ON public.workout_days;
    DROP POLICY IF EXISTS workout_days_trainer_all ON public.workout_days;
    DROP POLICY IF EXISTS workout_days_admin_all ON public.workout_days;

    -- Aluno vê dias do seu plano
    CREATE POLICY workout_days_student_select ON public.workout_days
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          JOIN public.students s ON s.id = wp.student_id
          WHERE wp.id = workout_days.workout_plan_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer gerencia dias
    CREATE POLICY workout_days_trainer_all ON public.workout_days
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          WHERE wp.id = workout_days.workout_plan_id
            AND wp.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          WHERE wp.id = workout_days.workout_plan_id
            AND wp.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY workout_days_admin_all ON public.workout_days
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3c. workout_exercise_groups
-- Colunas: id (uuid PK), workout_day_id (uuid FK -> workout_days.id),
--          workout_plan_id (uuid FK -> workout_plans.id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_exercise_groups') THEN
    ALTER TABLE IF EXISTS public.workout_exercise_groups ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workout_exercise_groups_student_select ON public.workout_exercise_groups;
    DROP POLICY IF EXISTS workout_exercise_groups_student_select_own ON public.workout_exercise_groups;
    DROP POLICY IF EXISTS workout_exercise_groups_trainer_all ON public.workout_exercise_groups;
    DROP POLICY IF EXISTS workout_exercise_groups_admin_all ON public.workout_exercise_groups;

    -- Aluno vê grupos do seu plano
    CREATE POLICY workout_exercise_groups_student_select ON public.workout_exercise_groups
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.workout_days wd
          JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
          JOIN public.students s ON s.id = wp.student_id
          WHERE wd.id = workout_exercise_groups.workout_day_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer gerencia grupos
    CREATE POLICY workout_exercise_groups_trainer_all ON public.workout_exercise_groups
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.workout_days wd
          JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
          WHERE wd.id = workout_exercise_groups.workout_day_id
            AND wp.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workout_days wd
          JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
          WHERE wd.id = workout_exercise_groups.workout_day_id
            AND wp.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY workout_exercise_groups_admin_all ON public.workout_exercise_groups
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3d. workout_plan_exercises
-- Colunas: id (uuid PK), workout_plan_id (uuid),
--          exercise_id (uuid?), workout_day_id (uuid?),
--          exercise_group_id (uuid?)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_plan_exercises') THEN
    ALTER TABLE IF EXISTS public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workout_plan_exercises_student_select ON public.workout_plan_exercises;
    DROP POLICY IF EXISTS workout_plan_exercises_student_select_own ON public.workout_plan_exercises;
    DROP POLICY IF EXISTS workout_plan_exercises_trainer_all ON public.workout_plan_exercises;
    DROP POLICY IF EXISTS workout_plan_exercises_admin_all ON public.workout_plan_exercises;

    -- Aluno vê exercícios do seu plano
    CREATE POLICY workout_plan_exercises_student_select ON public.workout_plan_exercises
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          JOIN public.students s ON s.id = wp.student_id
          WHERE wp.id = workout_plan_exercises.workout_plan_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer gerencia exercícios
    CREATE POLICY workout_plan_exercises_trainer_all ON public.workout_plan_exercises
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          WHERE wp.id = workout_plan_exercises.workout_plan_id
            AND wp.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workout_plans wp
          WHERE wp.id = workout_plan_exercises.workout_plan_id
            AND wp.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY workout_plan_exercises_admin_all ON public.workout_plan_exercises
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3e. workout_logs
-- Colunas: id (uuid PK), student_id (uuid), trainer_id (uuid),
--          workout_plan_id (uuid?)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_logs') THEN
    ALTER TABLE IF EXISTS public.workout_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workout_logs_student_select ON public.workout_logs;
    DROP POLICY IF EXISTS workout_logs_student_insert ON public.workout_logs;
    DROP POLICY IF EXISTS workout_logs_student_update ON public.workout_logs;
    DROP POLICY IF EXISTS workout_logs_trainer_select ON public.workout_logs;
    DROP POLICY IF EXISTS workout_logs_admin_all ON public.workout_logs;

    -- Aluno vê, insere e atualiza próprios logs
    CREATE POLICY workout_logs_student_select ON public.workout_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_logs.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY workout_logs_student_insert ON public.workout_logs
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_logs.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY workout_logs_student_update ON public.workout_logs
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_logs.student_id
            AND s.auth_user_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_logs.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer vê logs dos seus alunos
    CREATE POLICY workout_logs_trainer_select ON public.workout_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = workout_logs.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY workout_logs_admin_all ON public.workout_logs
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 4: EXERCISES
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 4. exercises
-- Colunas: id (uuid PK), trainer_id (uuid?, nullable — null = public),
--          is_public (boolean)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercises') THEN
    ALTER TABLE IF EXISTS public.exercises ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS exercises_select_public ON public.exercises;
    DROP POLICY IF EXISTS exercises_select_owner ON public.exercises;
    DROP POLICY IF EXISTS exercises_owner_insert ON public.exercises;
    DROP POLICY IF EXISTS exercises_owner_update ON public.exercises;
    DROP POLICY IF EXISTS exercises_owner_delete ON public.exercises;
    DROP POLICY IF EXISTS exercises_admin_all ON public.exercises;

    -- Público + próprio trainer vêem
    CREATE POLICY exercises_select_public ON public.exercises
      FOR SELECT USING (is_public = true);

    CREATE POLICY exercises_select_owner ON public.exercises
      FOR SELECT USING (
        trainer_id = auth.uid() OR is_admin()
      );

    -- Trainer gerencia próprios exercícios
    CREATE POLICY exercises_owner_insert ON public.exercises
      FOR INSERT WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY exercises_owner_update ON public.exercises
      FOR UPDATE USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY exercises_owner_delete ON public.exercises
      FOR DELETE USING (trainer_id = auth.uid());

    -- Admin irrestrito
    CREATE POLICY exercises_admin_all ON public.exercises
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 5: MESSAGES (canônica — chat_messages é legado)
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 5. messages
-- Colunas: id (uuid PK), trainer_id (uuid), student_id (uuid),
--          sender_id (uuid — quem enviou), sender_role (text)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS messages_student_select ON public.messages;
    DROP POLICY IF EXISTS messages_student_insert ON public.messages;
    DROP POLICY IF EXISTS messages_trainer_select ON public.messages;
    DROP POLICY IF EXISTS messages_trainer_insert ON public.messages;
    DROP POLICY IF EXISTS messages_trainer_update ON public.messages;
    DROP POLICY IF EXISTS messages_admin_all ON public.messages;

    -- Aluno vê e envia mensagens no seu chat
    CREATE POLICY messages_student_select ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY messages_student_insert ON public.messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Trainer vê, envia e marca como lidas mensagens dos seus alunos
    CREATE POLICY messages_trainer_select ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND (s.trainer_id = auth.uid() OR is_admin())
        )
      );

    CREATE POLICY messages_trainer_insert ON public.messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY messages_trainer_update ON public.messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY messages_admin_all ON public.messages
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 6: NOTIFICATIONS
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 6. notifications
-- Colunas: id (uuid PK), user_id (uuid = quem recebe)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS notifications_self_select ON public.notifications;
    DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
    DROP POLICY IF EXISTS notifications_trainer_select ON public.notifications;
    DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;

    -- Próprio usuário vê e marca como lidas
    CREATE POLICY notifications_self_select ON public.notifications
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY notifications_self_update ON public.notifications
      FOR UPDATE USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Trainer vê notificações dos seus alunos
    -- (notifications.user_id = student.auth_user_id, trainer tem acesso via students.trainer_id)
    CREATE POLICY notifications_trainer_select ON public.notifications
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.auth_user_id = notifications.user_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY notifications_admin_all ON public.notifications
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 7: PAYMENTS & SUBSCRIPTIONS
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 7a. payments
-- Colunas: id (uuid PK), trainer_id (uuid), student_id (uuid?)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS payments_trainer_all ON public.payments;
    DROP POLICY IF EXISTS payments_student_select ON public.payments;
    DROP POLICY IF EXISTS payments_admin_all ON public.payments;

    -- Trainer gerencia pagamentos
    CREATE POLICY payments_trainer_all ON public.payments
      FOR ALL USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid());

    -- Aluno vê seus pagamentos
    CREATE POLICY payments_student_select ON public.payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = payments.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY payments_admin_all ON public.payments
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7b. trainer_payment_settings
-- Colunas: id (uuid PK), trainer_id (uuid, unique)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trainer_payment_settings') THEN
    ALTER TABLE IF EXISTS public.trainer_payment_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS trainer_payment_settings_self_select ON public.trainer_payment_settings;
    DROP POLICY IF EXISTS trainer_payment_settings_self_insert ON public.trainer_payment_settings;
    DROP POLICY IF EXISTS trainer_payment_settings_self_update ON public.trainer_payment_settings;
    DROP POLICY IF EXISTS trainer_payment_settings_admin_all ON public.trainer_payment_settings;

    CREATE POLICY trainer_payment_settings_self_select ON public.trainer_payment_settings
      FOR SELECT USING (trainer_id = auth.uid());

    CREATE POLICY trainer_payment_settings_self_insert ON public.trainer_payment_settings
      FOR INSERT WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY trainer_payment_settings_self_update ON public.trainer_payment_settings
      FOR UPDATE USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY trainer_payment_settings_admin_all ON public.trainer_payment_settings
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7c. subscription_plans
-- Colunas: id (TEXT PK!), slug (text), features (jsonb?)
-- Observação: id é TEXT, não UUID. Acesso público para listar planos.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_plans') THEN
    ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS subscription_plans_public_select ON public.subscription_plans;
    DROP POLICY IF EXISTS subscription_plans_admin_all ON public.subscription_plans;

    CREATE POLICY subscription_plans_public_select ON public.subscription_plans
      FOR SELECT USING (true);

    CREATE POLICY subscription_plans_admin_all ON public.subscription_plans
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7d. subscriptions
-- Colunas: id (uuid PK), trainer_id (uuid FK -> trainer_profiles.id),
--          plan_slug (text)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS subscriptions_trainer_select ON public.subscriptions;
    DROP POLICY IF EXISTS subscriptions_trainer_insert ON public.subscriptions;
    DROP POLICY IF EXISTS subscriptions_student_select ON public.subscriptions;
    DROP POLICY IF EXISTS subscriptions_admin_all ON public.subscriptions;

    -- Trainer vê e gerencia própria subscription
    CREATE POLICY subscriptions_trainer_select ON public.subscriptions
      FOR SELECT USING (trainer_id = auth.uid());

    CREATE POLICY subscriptions_trainer_insert ON public.subscriptions
      FOR INSERT WITH CHECK (trainer_id = auth.uid());

    -- Aluno vê subscription do seu trainer
    CREATE POLICY subscriptions_student_select ON public.subscriptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.trainer_id = subscriptions.trainer_id
            AND s.auth_user_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY subscriptions_admin_all ON public.subscriptions
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 8: PLATFORM (admin-only)
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 8a. platform_subscription_payments
-- Colunas: id (uuid PK), trainer_id (uuid), subscription_id (uuid?)
--          Criado por Edge Functions (service_role), lido por admin.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_subscription_payments') THEN
    ALTER TABLE IF EXISTS public.platform_subscription_payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS platform_subscription_payments_admin_all ON public.platform_subscription_payments;

    CREATE POLICY platform_subscription_payments_admin_all ON public.platform_subscription_payments
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8b. platform_webhook_events
-- Criado/setado por mercadopago-webhook (service_role), lido por admin.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_webhook_events') THEN
    ALTER TABLE IF EXISTS public.platform_webhook_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS platform_webhook_events_admin_all ON public.platform_webhook_events;

    CREATE POLICY platform_webhook_events_admin_all ON public.platform_webhook_events
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8c. subscription_checkout_attempts
-- Criado por create-mercadopago-subscription / mercadopago-webhook, lido por admin.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_checkout_attempts') THEN
    ALTER TABLE IF EXISTS public.subscription_checkout_attempts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS subscription_checkout_attempts_admin_all ON public.subscription_checkout_attempts;

    CREATE POLICY subscription_checkout_attempts_admin_all ON public.subscription_checkout_attempts
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 9: SIGNUP
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 9a. coach_signup_links (canônica — signup_links é legada)
-- Colunas: id (uuid PK), coach_auth_user_id (uuid = auth.uid()),
--          slug (text), is_active (boolean)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coach_signup_links') THEN
    ALTER TABLE IF EXISTS public.coach_signup_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS coach_signup_links_public_select ON public.coach_signup_links;
    DROP POLICY IF EXISTS coach_signup_links_owner_all ON public.coach_signup_links;
    DROP POLICY IF EXISTS coach_signup_links_admin_all ON public.coach_signup_links;

    -- Público: SELECT links ativos
    CREATE POLICY coach_signup_links_public_select ON public.coach_signup_links
      FOR SELECT USING (is_active = true);

    -- Trainer dono: ALL
    CREATE POLICY coach_signup_links_owner_all ON public.coach_signup_links
      FOR ALL USING (coach_auth_user_id = auth.uid())
      WITH CHECK (coach_auth_user_id = auth.uid());

    -- Admin irrestrito
    CREATE POLICY coach_signup_links_admin_all ON public.coach_signup_links
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9b. signup_leads
-- Colunas: id (uuid PK), trainer_id (uuid), converted_student_id (uuid?),
--          signup_link_id (uuid?), …
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'signup_leads') THEN
    ALTER TABLE IF EXISTS public.signup_leads ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS signup_leads_public_insert ON public.signup_leads;
    DROP POLICY IF EXISTS signup_leads_trainer_select ON public.signup_leads;
    DROP POLICY IF EXISTS signup_leads_trainer_update ON public.signup_leads;
    DROP POLICY IF EXISTS signup_leads_trainer_delete ON public.signup_leads;
    DROP POLICY IF EXISTS signup_leads_admin_all ON public.signup_leads;

    -- Público pode enviar lead
    CREATE POLICY signup_leads_public_insert ON public.signup_leads
      FOR INSERT WITH CHECK (true);

    -- Trainer vê/atualiza/deleta leads do seu link
    CREATE POLICY signup_leads_trainer_select ON public.signup_leads
      FOR SELECT USING (trainer_id = auth.uid());

    CREATE POLICY signup_leads_trainer_update ON public.signup_leads
      FOR UPDATE USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid());

    CREATE POLICY signup_leads_trainer_delete ON public.signup_leads
      FOR DELETE USING (trainer_id = auth.uid());

    -- Admin irrestrito
    CREATE POLICY signup_leads_admin_all ON public.signup_leads
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 10: PROGRESS & APP
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 10a. progress_photos
-- Colunas: id (uuid PK), student_id (uuid FK -> students.id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progress_photos') THEN
    ALTER TABLE IF EXISTS public.progress_photos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS progress_photos_self_select ON public.progress_photos;
    DROP POLICY IF EXISTS progress_photos_trainer_all ON public.progress_photos;
    DROP POLICY IF EXISTS progress_photos_admin_all ON public.progress_photos;

    CREATE POLICY progress_photos_self_select ON public.progress_photos
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = progress_photos.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY progress_photos_trainer_all ON public.progress_photos
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = progress_photos.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = progress_photos.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY progress_photos_admin_all ON public.progress_photos
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10b. app_presence
-- Colunas: id (uuid PK), user_id (uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_presence') THEN
    ALTER TABLE IF EXISTS public.app_presence ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS app_presence_self_upsert ON public.app_presence;
    DROP POLICY IF EXISTS app_presence_trainer_select ON public.app_presence;
    DROP POLICY IF EXISTS app_presence_admin_all ON public.app_presence;

    -- Próprio usuário upserta sua presença
    CREATE POLICY app_presence_self_upsert ON public.app_presence
      FOR ALL USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Trainer vê presença dos seus alunos
    CREATE POLICY app_presence_trainer_select ON public.app_presence
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.auth_user_id = app_presence.user_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY app_presence_admin_all ON public.app_presence
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 11: LEGACY — SIGNUP (dados históricos)
-- ==============================================================================
-- signup_links e signup_link_visits são DEPRECATED (substituídas por
-- coach_signup_links). Mantemos policies apenas para acesso a dados existentes.

-- ---------------------------------------------------------------------------
-- 11a. signup_links (DEPRECATED)
-- Colunas: id (uuid PK), trainer_id (uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'signup_links') THEN
    ALTER TABLE IF EXISTS public.signup_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS signup_links_select_active_public ON public.signup_links;
    DROP POLICY IF EXISTS signup_links_trainer_all ON public.signup_links;

    CREATE POLICY signup_links_select_active_public ON public.signup_links
      FOR SELECT USING (is_active = true OR trainer_id = auth.uid() OR is_admin());

    CREATE POLICY signup_links_trainer_all ON public.signup_links
      FOR ALL USING (trainer_id = auth.uid() OR is_admin())
      WITH CHECK (trainer_id = auth.uid() OR is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 11b. signup_link_visits (DEPRECATED)
-- Colunas: id (uuid PK), signup_link_id (uuid), trainer_id (uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'signup_link_visits') THEN
    ALTER TABLE IF EXISTS public.signup_link_visits ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS signup_link_visits_public_insert ON public.signup_link_visits;
    DROP POLICY IF EXISTS signup_link_visits_trainer_select ON public.signup_link_visits;

    CREATE POLICY signup_link_visits_public_insert ON public.signup_link_visits
      FOR INSERT WITH CHECK (true);

    CREATE POLICY signup_link_visits_trainer_select ON public.signup_link_visits
      FOR SELECT USING (trainer_id = auth.uid() OR is_admin());
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 12: LEGACY — SUPPORT & CHAT
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 12a. support_tickets
-- Colunas: id (uuid PK), requester_id (TEXT — NÃO é uuid),
--          requester_email (text)
-- ATENÇÃO: requester_id é TEXT. Comparações usam auth.uid()::text.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS support_tickets_self_select ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_self_insert ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_self_update ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_trainer_all ON public.support_tickets;
    DROP POLICY IF EXISTS support_tickets_admin_all ON public.support_tickets;

    -- Próprio usuário: ver, criar, atualizar
    -- CAST EXPLÍCITO: auth.uid()::text = requester_id (TEXT)
    CREATE POLICY support_tickets_self_select ON public.support_tickets
      FOR SELECT USING (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
      );

    CREATE POLICY support_tickets_self_insert ON public.support_tickets
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND (requester_id = auth.uid()::text OR requester_email = auth.jwt() ->> 'email')
      );

    CREATE POLICY support_tickets_self_update ON public.support_tickets
      FOR UPDATE USING (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
      ) WITH CHECK (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
      );

    -- Trainer: ALL tickets dos seus alunos
    -- CAST: s.id::text = support_tickets.requester_id (TEXT + TEXT = OK)
    -- CAST: s.email = support_tickets.requester_email (TEXT + TEXT = OK)
    CREATE POLICY support_tickets_trainer_all ON public.support_tickets
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY support_tickets_admin_all ON public.support_tickets
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 12b. support_messages
-- Colunas: id (uuid PK), ticket_id (uuid FK -> support_tickets.id),
--          sender_id (TEXT), sender_email (text)
-- ATENÇÃO: sender_id é TEXT. Comparações usam auth.uid()::text.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_messages') THEN
    ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS support_messages_self_select ON public.support_messages;
    DROP POLICY IF EXISTS support_messages_self_insert ON public.support_messages;
    DROP POLICY IF EXISTS support_messages_self_update ON public.support_messages;
    DROP POLICY IF EXISTS support_messages_trainer_all ON public.support_messages;
    DROP POLICY IF EXISTS support_messages_admin_all ON public.support_messages;

    -- Próprio usuário: ver mensagens dos seus tickets
    CREATE POLICY support_messages_self_select ON public.support_messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_messages.ticket_id
            AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email')
        )
      );

    -- Próprio usuário: enviar mensagens nos seus tickets
    CREATE POLICY support_messages_self_insert ON public.support_messages
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_messages.ticket_id
            AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email')
        )
      );

    -- Próprio usuário: atualizar suas mensagens
    -- CAST: auth.uid()::text = sender_id (TEXT)
    CREATE POLICY support_messages_self_update ON public.support_messages
      FOR UPDATE USING (
        sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
      ) WITH CHECK (
        sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
      );

    -- Trainer: ALL mensagens dos tickets dos seus alunos
    CREATE POLICY support_messages_trainer_all ON public.support_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.support_tickets t
          JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
          WHERE t.id = support_messages.ticket_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.support_tickets t
          JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
          WHERE t.id = support_messages.ticket_id
            AND s.trainer_id = auth.uid()
        )
      );

    -- Admin irrestrito
    CREATE POLICY support_messages_admin_all ON public.support_messages
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 12c. chat_messages (LEGADO — a canônica é messages)
-- Colunas: id (TEXT PK), student_id (uuid, se existir),
--          studentid (TEXT), sender_id (TEXT?), receiver_id (TEXT?)
-- Mantemos policies para acesso a dados históricos.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS chat_messages_student_all_own ON public.chat_messages;
    DROP POLICY IF EXISTS chat_messages_trainer_all ON public.chat_messages;

    -- Aluno: ALL nas suas mensagens
    -- SUPORTE A AMBOS: student_id (uuid) e studentid (text legacy)
    -- CAST: s.id::text = chat_messages.studentid (TEXT + TEXT = OK)
    CREATE POLICY chat_messages_student_all_own ON public.chat_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = chat_messages.student_id AND s.auth_user_id = auth.uid())
             OR (s.id::text = chat_messages.studentid AND s.auth_user_id = auth.uid())
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = chat_messages.student_id AND s.auth_user_id = auth.uid())
             OR (s.id::text = chat_messages.studentid AND s.auth_user_id = auth.uid())
        )
      );

    -- Trainer: ALL mensagens dos seus alunos
    CREATE POLICY chat_messages_trainer_all ON public.chat_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = chat_messages.student_id AND s.trainer_id = auth.uid())
             OR (s.id::text = chat_messages.studentid AND s.trainer_id = auth.uid())
             OR is_admin()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = chat_messages.student_id AND s.trainer_id = auth.uid())
             OR (s.id::text = chat_messages.studentid AND s.trainer_id = auth.uid())
             OR is_admin()
        )
      );
  END IF;
END;
$$;


-- ==============================================================================
-- MÓDULO 13: LEGACY — DADOS HISTÓRICOS (student_payments, student_progress,
--   student_progress_photos, student_achievements, student_milestones,
--   biometric_history, body_measurements, historical_metrics,
--   subscription_events, appointments, nutrition_plans)
-- ==============================================================================
-- Estas tabelas têm dados existentes mas NENHUM código React as consulta.
-- Mantemos policies para preservar acesso via API direta ou futura migração.
-- Todas seguem o padrão: self_select, trainer_all, admin_all.
-- ONDE student_id é TEXT: usamos s.id::text = tabela.student_id.
-- ONDE student_id é uuid: usamos s.id = tabela.student_id.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 13a. student_payments
-- student_id é TEXT → cast: s.id::text = student_payments.student_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_payments') THEN
    ALTER TABLE IF EXISTS public.student_payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_payments_student_select ON public.student_payments;
    DROP POLICY IF EXISTS student_payments_trainer_all ON public.student_payments;
    DROP POLICY IF EXISTS student_payments_admin_all ON public.student_payments;

    -- CAST: s.id::text = student_payments.student_id (TEXT + TEXT)
    CREATE POLICY student_payments_student_select ON public.student_payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_payments.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_payments_trainer_all ON public.student_payments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_payments.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_payments.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_payments_admin_all ON public.student_payments
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13b. student_progress (student_id é uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_progress') THEN
    ALTER TABLE IF EXISTS public.student_progress ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_progress_self_select ON public.student_progress;
    DROP POLICY IF EXISTS student_progress_trainer_all ON public.student_progress;
    DROP POLICY IF EXISTS student_progress_admin_all ON public.student_progress;

    CREATE POLICY student_progress_self_select ON public.student_progress
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_progress.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_progress_trainer_all ON public.student_progress
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_progress.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_progress.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_progress_admin_all ON public.student_progress
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13c. student_progress_photos (student_id é TEXT)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_progress_photos') THEN
    ALTER TABLE IF EXISTS public.student_progress_photos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_progress_photos_self_select ON public.student_progress_photos;
    DROP POLICY IF EXISTS student_progress_photos_trainer_all ON public.student_progress_photos;
    DROP POLICY IF EXISTS student_progress_photos_admin_all ON public.student_progress_photos;

    -- CAST: s.id::text = student_progress_photos.student_id (TEXT + TEXT)
    CREATE POLICY student_progress_photos_self_select ON public.student_progress_photos
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_progress_photos.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_progress_photos_trainer_all ON public.student_progress_photos
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_progress_photos.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_progress_photos.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_progress_photos_admin_all ON public.student_progress_photos
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13d. student_achievements (student_id é TEXT)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_achievements') THEN
    ALTER TABLE IF EXISTS public.student_achievements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_achievements_self_select ON public.student_achievements;
    DROP POLICY IF EXISTS student_achievements_trainer_all ON public.student_achievements;
    DROP POLICY IF EXISTS student_achievements_admin_all ON public.student_achievements;

    CREATE POLICY student_achievements_self_select ON public.student_achievements
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_achievements.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_achievements_trainer_all ON public.student_achievements
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_achievements.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_achievements.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_achievements_admin_all ON public.student_achievements
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13e. student_milestones (student_id é TEXT, id é TEXT PK)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_milestones') THEN
    ALTER TABLE IF EXISTS public.student_milestones ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS student_milestones_self_select ON public.student_milestones;
    DROP POLICY IF EXISTS student_milestones_trainer_all ON public.student_milestones;
    DROP POLICY IF EXISTS student_milestones_admin_all ON public.student_milestones;

    CREATE POLICY student_milestones_self_select ON public.student_milestones
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_milestones.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY student_milestones_trainer_all ON public.student_milestones
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_milestones.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id::text = student_milestones.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY student_milestones_admin_all ON public.student_milestones
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13f. biometric_history (student_id é uuid? Assumindo uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'biometric_history') THEN
    ALTER TABLE IF EXISTS public.biometric_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS biometric_history_self_select ON public.biometric_history;
    DROP POLICY IF EXISTS biometric_history_trainer_all ON public.biometric_history;
    DROP POLICY IF EXISTS biometric_history_admin_all ON public.biometric_history;

    CREATE POLICY biometric_history_self_select ON public.biometric_history
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = biometric_history.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY biometric_history_trainer_all ON public.biometric_history
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = biometric_history.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = biometric_history.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY biometric_history_admin_all ON public.biometric_history
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13g. body_measurements (student_id é uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'body_measurements') THEN
    ALTER TABLE IF EXISTS public.body_measurements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS body_measurements_self_select ON public.body_measurements;
    DROP POLICY IF EXISTS body_measurements_trainer_all ON public.body_measurements;
    DROP POLICY IF EXISTS body_measurements_admin_all ON public.body_measurements;

    CREATE POLICY body_measurements_self_select ON public.body_measurements
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = body_measurements.student_id
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY body_measurements_trainer_all ON public.body_measurements
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = body_measurements.student_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = body_measurements.student_id
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY body_measurements_admin_all ON public.body_measurements
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13h. historical_metrics (student_id é TEXT, studentid é TEXT, id é TEXT PK)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historical_metrics') THEN
    ALTER TABLE IF EXISTS public.historical_metrics ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS historical_metrics_self_select ON public.historical_metrics;
    DROP POLICY IF EXISTS historical_metrics_trainer_all ON public.historical_metrics;
    DROP POLICY IF EXISTS historical_metrics_admin_all ON public.historical_metrics;

    CREATE POLICY historical_metrics_self_select ON public.historical_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id::text = historical_metrics.student_id OR s.id::text = historical_metrics.studentid)
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY historical_metrics_trainer_all ON public.historical_metrics
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id::text = historical_metrics.student_id OR s.id::text = historical_metrics.studentid)
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id::text = historical_metrics.student_id OR s.id::text = historical_metrics.studentid)
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY historical_metrics_admin_all ON public.historical_metrics
      FOR ALL USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13i. subscription_events (user_id é uuid)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_events') THEN
    ALTER TABLE IF EXISTS public.subscription_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS subscription_events_user_select ON public.subscription_events;
    DROP POLICY IF EXISTS subscription_events_trainer_all ON public.subscription_events;

    CREATE POLICY subscription_events_user_select ON public.subscription_events
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY subscription_events_trainer_all ON public.subscription_events
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.auth_user_id = subscription_events.user_id
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.auth_user_id = subscription_events.user_id
            AND s.trainer_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13j. appointments (student_id é uuid?, studentid é TEXT)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
    ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS appointments_trainer_all ON public.appointments;
    DROP POLICY IF EXISTS appointments_student_select ON public.appointments;

    CREATE POLICY appointments_trainer_all ON public.appointments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = appointments.student_id OR s.id::text = appointments.studentid)
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = appointments.student_id OR s.id::text = appointments.studentid)
            AND s.trainer_id = auth.uid()
        )
      );

    CREATE POLICY appointments_student_select ON public.appointments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = appointments.student_id OR s.id::text = appointments.studentid)
            AND s.auth_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13k. nutrition_plans (student_id é uuid?, studentid é TEXT)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nutrition_plans') THEN
    ALTER TABLE IF EXISTS public.nutrition_plans ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS nutrition_plans_student_select ON public.nutrition_plans;
    DROP POLICY IF EXISTS nutrition_plans_trainer_all ON public.nutrition_plans;

    CREATE POLICY nutrition_plans_student_select ON public.nutrition_plans
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
            AND s.auth_user_id = auth.uid()
        )
      );

    CREATE POLICY nutrition_plans_trainer_all ON public.nutrition_plans
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
            AND s.trainer_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
            AND s.trainer_id = auth.uid()
        )
      );
  END IF;
END;
$$;


-- ==============================================================================
-- FIM DA MIGRATION
-- ==============================================================================
-- 
-- VERIFICAÇÕES PÓS-EXECUÇÃO (executar no SQL Editor do Supabase):
--
-- 1. Quantas políticas foram criadas?
--    SELECT schemaname, tablename, policyname
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
-- 2. Todas as tabelas com RLS ativo?
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename NOT IN ('spatial_ref_sys')
--    ORDER BY tablename;
--
-- 3. Teste como anon:
--    SELECT * FROM public.coach_signup_links WHERE is_active = true LIMIT 1;
--
-- 4. Teste como aluno autenticado:
--    SELECT * FROM public.students WHERE auth_user_id = auth.uid();
--
-- 5. Teste como personal:
--    SELECT s.* FROM public.students s WHERE s.trainer_id = auth.uid();
--
-- ==============================================================================
