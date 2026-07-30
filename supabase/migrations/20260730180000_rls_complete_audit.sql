-- ==============================================================================
-- VSFit Personal — Auditoria e Consolidação de RLS (Todas as Tabelas)
-- ==============================================================================
--
-- PROBLEMAS IDENTIFICADOS:
--   1. `students` NUNCA teve RLS ativado — nenhuma policy existe. Todas as
--      policies de outras tabelas que fazem subquery `FROM students` falham
--      com "permission denied" para usuários que não têm acesso a students.
--
--   2. Tabelas sem RLS algum:
--      student_metrics, progress_photos, student_goals, messages,
--      trainer_payment_settings, subscription_plans, platform_webhook_events,
--      biometric_history, app_presence
--
--   3. `exercises`, `workout_logs`, `workout_plans`, `workout_plan_exercises`
--      têm RLS ativado mas NENHUMA policy CREATE nos migrations (só comentários).
--      Dependem de policies criadas fora do repositório.
--
--   4. `messages` (chat) versus `chat_messages` — o código usa `messages`,
--      mas as policies criadas são para `chat_messages`. `messages` nunca
--      recebeu policies.
--
--   5. Policies duplicadas/conflitantes:
--      - fix_chat_messages_policies.sql e fix_chat_messages_policy.sql
--        criam as mesmas policies repetidamente em migrations diferentes.
--      - 20260709150000 cria trainer_policies que conflitam com
--        20260728120000 que recria as mesmas com estrutura diferente.
--
--   6. Casts uuid::text desnecessários em:
--      - support_tickets (requester_id::text = auth.uid()::text)
--      - student_accounts (s.id::text = student_accounts.studentid)
--      - storage policies (auth.uid()::text)
--
-- SOLUÇÃO: Esta migration substitui todas as políticas fragmentadas por
-- uma arquitetura uniforme, 4 roles:
--   A. ANON (public) — acesso mínimo necessário para cadastro público
--   B. PERSONAL (trainer) — acesso aos próprios alunos e dados deles
--   C. STUDENT (aluno) — acesso apenas aos próprios dados
--   D. ADMIN (is_admin()) — acesso irrestrito
--
-- ==============================================================================
-- PRÉ-REQUISITO: Função is_admin()
-- ==============================================================================
-- Garante que a função existe (idempotente)
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
-- 1. TABELA: students
-- ==============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_self_select ON public.students;
DROP POLICY IF EXISTS students_self_update ON public.students;
DROP POLICY IF EXISTS students_trainer_all ON public.students;
DROP POLICY IF EXISTS students_admin_all ON public.students;

-- Aluno vê apenas o próprio registro
CREATE POLICY students_self_select ON public.students
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Trainer vê seus próprios alunos
DROP POLICY IF EXISTS students_trainer_select ON public.students;
CREATE POLICY students_trainer_select ON public.students
    FOR SELECT
    USING (trainer_id = auth.uid());

-- Trainer gerencia alunos (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS students_trainer_insert ON public.students;
CREATE POLICY students_trainer_insert ON public.students
    FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS students_trainer_update ON public.students;
CREATE POLICY students_trainer_update ON public.students
    FOR UPDATE
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS students_trainer_delete ON public.students;
CREATE POLICY students_trainer_delete ON public.students
    FOR DELETE
    USING (trainer_id = auth.uid());

-- Aluno pode atualizar campos próprios (avatar, phone, etc.)
DROP POLICY IF EXISTS students_self_update ON public.students;
CREATE POLICY students_self_update ON public.students
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Admin: irrestrito
DROP POLICY IF EXISTS students_admin_all ON public.students;
CREATE POLICY students_admin_all ON public.students
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 2. TABELA: user_profiles
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_self_select ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_self_insert ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_student_view_trainer ON public.user_profiles;

-- PRÓPRIO USUÁRIO: pode ler, criar e editar o próprio perfil
CREATE POLICY user_profiles_self_select ON public.user_profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY user_profiles_self_insert ON public.user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY user_profiles_self_update ON public.user_profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ALUNO: pode ver user_profile do seu trainer (role = 'personal')
DROP POLICY IF EXISTS user_profiles_student_view_trainer ON public.user_profiles;
CREATE POLICY user_profiles_student_view_trainer ON public.user_profiles
    FOR SELECT
    USING (
        role = 'personal'
        AND EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.trainer_id = user_profiles.id
              AND s.auth_user_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS user_profiles_admin_all ON public.user_profiles;
CREATE POLICY user_profiles_admin_all ON public.user_profiles
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 3. TABELA: trainer_profiles
-- ==============================================================================
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainer_profiles_self_select ON public.trainer_profiles;
DROP POLICY IF EXISTS trainer_profiles_self_insert ON public.trainer_profiles;
DROP POLICY IF EXISTS trainer_profiles_self_update ON public.trainer_profiles;
DROP POLICY IF EXISTS trainer_profiles_student_view_trainer ON public.trainer_profiles;
DROP POLICY IF EXISTS trainer_profiles_public_signup_read ON public.trainer_profiles;

-- PRÓPRIO TRAINER: self-service
CREATE POLICY trainer_profiles_self_select ON public.trainer_profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY trainer_profiles_self_insert ON public.trainer_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY trainer_profiles_self_update ON public.trainer_profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ALUNO: pode ver perfil do seu trainer
DROP POLICY IF EXISTS trainer_profiles_student_view_trainer ON public.trainer_profiles;
CREATE POLICY trainer_profiles_student_view_trainer ON public.trainer_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.trainer_id = trainer_profiles.id
              AND s.auth_user_id = auth.uid()
        )
    );

-- PÚBLICO (ANON): pode ver perfil de trainers com link de cadastro ativo
DROP POLICY IF EXISTS trainer_profiles_public_signup_read ON public.trainer_profiles;
CREATE POLICY trainer_profiles_public_signup_read ON public.trainer_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_signup_links csl
            WHERE csl.coach_auth_user_id = trainer_profiles.id
              AND csl.is_active = true
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS trainer_profiles_admin_all ON public.trainer_profiles;
CREATE POLICY trainer_profiles_admin_all ON public.trainer_profiles
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 4. TABELA: coach_signup_links
-- ==============================================================================
ALTER TABLE public.coach_signup_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_signup_links_public_select ON public.coach_signup_links;
DROP POLICY IF EXISTS coach_signup_links_owner_all ON public.coach_signup_links;

-- PÚBLICO: ver links ativos
CREATE POLICY coach_signup_links_public_select ON public.coach_signup_links
    FOR SELECT
    USING (is_active = true);

-- TRAINER DONO: gerenciar próprios links
CREATE POLICY coach_signup_links_owner_all ON public.coach_signup_links
    FOR ALL
    USING (coach_auth_user_id = auth.uid())
    WITH CHECK (coach_auth_user_id = auth.uid());

-- ADMIN: irrestrito
DROP POLICY IF EXISTS coach_signup_links_admin_all ON public.coach_signup_links;
CREATE POLICY coach_signup_links_admin_all ON public.coach_signup_links
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 5. TABELA: signup_leads
-- ==============================================================================
ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_leads_public_insert ON public.signup_leads;
DROP POLICY IF EXISTS signup_leads_trainer_all ON public.signup_leads;

-- PÚBLICO: qualquer visitante pode enviar lead
CREATE POLICY signup_leads_public_insert ON public.signup_leads
    FOR INSERT
    WITH CHECK (true);

-- TRAINER: gerenciar leads dos seus links
DROP POLICY IF EXISTS signup_leads_trainer_select ON public.signup_leads;
CREATE POLICY signup_leads_trainer_select ON public.signup_leads
    FOR SELECT
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS signup_leads_trainer_update ON public.signup_leads;
CREATE POLICY signup_leads_trainer_update ON public.signup_leads
    FOR UPDATE
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS signup_leads_trainer_delete ON public.signup_leads;
CREATE POLICY signup_leads_trainer_delete ON public.signup_leads
    FOR DELETE
    USING (trainer_id = auth.uid());

-- ADMIN: irrestrito
DROP POLICY IF EXISTS signup_leads_admin_all ON public.signup_leads;
CREATE POLICY signup_leads_admin_all ON public.signup_leads
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 6. TABELA: student_accounts
-- ==============================================================================
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_accounts_select_own ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_update_own_student ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_insert_own_student ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_delete_own_student ON public.student_accounts;

-- ALUNO: ver própria conta de acesso
DROP POLICY IF EXISTS student_accounts_self_select ON public.student_accounts;
CREATE POLICY student_accounts_self_select ON public.student_accounts
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- ALUNO: atualizar própria conta (ex: primeiro login, trocar senha)
DROP POLICY IF EXISTS student_accounts_self_update ON public.student_accounts;
CREATE POLICY student_accounts_self_update ON public.student_accounts
    FOR UPDATE
    USING (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email')
    WITH CHECK (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- TRAINER: gerenciar contas de acesso dos seus alunos
DROP POLICY IF EXISTS student_accounts_trainer_select ON public.student_accounts;
CREATE POLICY student_accounts_trainer_select ON public.student_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_accounts.student_id
              AND s.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS student_accounts_trainer_insert ON public.student_accounts;
CREATE POLICY student_accounts_trainer_insert ON public.student_accounts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_accounts.student_id
              AND s.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS student_accounts_trainer_update ON public.student_accounts;
CREATE POLICY student_accounts_trainer_update ON public.student_accounts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_accounts.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_accounts.student_id
              AND s.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS student_accounts_trainer_delete ON public.student_accounts;
CREATE POLICY student_accounts_trainer_delete ON public.student_accounts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_accounts.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS student_accounts_admin_all ON public.student_accounts;
CREATE POLICY student_accounts_admin_all ON public.student_accounts
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 7. TABELA: student_goals
-- ==============================================================================
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- ALUNO: ver e criar próprios goals
DROP POLICY IF EXISTS student_goals_self_select ON public.student_goals;
CREATE POLICY student_goals_self_select ON public.student_goals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_goals.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS student_goals_self_insert ON public.student_goals;
CREATE POLICY student_goals_self_insert ON public.student_goals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_goals.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar goals dos seus alunos
DROP POLICY IF EXISTS student_goals_trainer_all ON public.student_goals;
CREATE POLICY student_goals_trainer_all ON public.student_goals
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_goals.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_goals.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS student_goals_admin_all ON public.student_goals;
CREATE POLICY student_goals_admin_all ON public.student_goals
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 8. TABELA: student_metrics
-- ==============================================================================
ALTER TABLE public.student_metrics ENABLE ROW LEVEL SECURITY;

-- ALUNO: ver próprias métricas
DROP POLICY IF EXISTS student_metrics_self_select ON public.student_metrics;
CREATE POLICY student_metrics_self_select ON public.student_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_metrics.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar métricas dos seus alunos
DROP POLICY IF EXISTS student_metrics_trainer_all ON public.student_metrics;
CREATE POLICY student_metrics_trainer_all ON public.student_metrics
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_metrics.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_metrics.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS student_metrics_admin_all ON public.student_metrics;
CREATE POLICY student_metrics_admin_all ON public.student_metrics
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 9. TABELA: biometric_history
-- ==============================================================================
ALTER TABLE public.biometric_history ENABLE ROW LEVEL SECURITY;

-- ALUNO: ver próprio histórico biométrico
DROP POLICY IF EXISTS biometric_history_self_select ON public.biometric_history;
CREATE POLICY biometric_history_self_select ON public.biometric_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = biometric_history.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar histórico dos seus alunos
DROP POLICY IF EXISTS biometric_history_trainer_all ON public.biometric_history;
CREATE POLICY biometric_history_trainer_all ON public.biometric_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = biometric_history.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = biometric_history.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS biometric_history_admin_all ON public.biometric_history;
CREATE POLICY biometric_history_admin_all ON public.biometric_history
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 10. TABELA: progress_photos
-- ==============================================================================
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- ALUNO: ver próprias fotos
DROP POLICY IF EXISTS progress_photos_self_select ON public.progress_photos;
CREATE POLICY progress_photos_self_select ON public.progress_photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = progress_photos.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar fotos dos seus alunos
DROP POLICY IF EXISTS progress_photos_trainer_all ON public.progress_photos;
CREATE POLICY progress_photos_trainer_all ON public.progress_photos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = progress_photos.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = progress_photos.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS progress_photos_admin_all ON public.progress_photos;
CREATE POLICY progress_photos_admin_all ON public.progress_photos
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 11. TABELA: messages (Chat entre Personal e Aluno)
-- ==============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ALUNO: ver e enviar mensagens onde é o student_id
DROP POLICY IF EXISTS messages_student_select ON public.messages;
CREATE POLICY messages_student_select ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = messages.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS messages_student_insert ON public.messages;
CREATE POLICY messages_student_insert ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_role = 'student'
        AND EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = messages.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: ver e gerenciar mensagens com seus alunos
DROP POLICY IF EXISTS messages_trainer_select ON public.messages;
CREATE POLICY messages_trainer_select ON public.messages
    FOR SELECT
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS messages_trainer_insert ON public.messages;
CREATE POLICY messages_trainer_insert ON public.messages
    FOR INSERT
    WITH CHECK (
        trainer_id = auth.uid()
        AND sender_role = 'personal'
    );

DROP POLICY IF EXISTS messages_trainer_update ON public.messages;
CREATE POLICY messages_trainer_update ON public.messages
    FOR UPDATE
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

-- ADMIN: irrestrito
DROP POLICY IF EXISTS messages_admin_all ON public.messages;
CREATE POLICY messages_admin_all ON public.messages
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Nota: DELETE não definido — mensagens não são deletadas pela aplicação.
-- Se necessário no futuro, adicionar via admin.


-- ==============================================================================
-- 12. TABELA: notifications
-- ==============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_trainer_view_students ON public.notifications;

-- ALUNO: ver e atualizar próprias notificações
DROP POLICY IF EXISTS notifications_self_select ON public.notifications;
CREATE POLICY notifications_self_select ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
CREATE POLICY notifications_self_update ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRAINER: ver notificações dos seus alunos
DROP POLICY IF EXISTS notifications_trainer_select ON public.notifications;
CREATE POLICY notifications_trainer_select ON public.notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.auth_user_id = notifications.user_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 13. TABELA: trainer_payment_settings
-- ==============================================================================
ALTER TABLE public.trainer_payment_settings ENABLE ROW LEVEL SECURITY;

-- TRAINER: gerenciar próprias configurações
DROP POLICY IF EXISTS trainer_payment_settings_self_select ON public.trainer_payment_settings;
CREATE POLICY trainer_payment_settings_self_select ON public.trainer_payment_settings
    FOR SELECT
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS trainer_payment_settings_self_insert ON public.trainer_payment_settings;
CREATE POLICY trainer_payment_settings_self_insert ON public.trainer_payment_settings
    FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS trainer_payment_settings_self_update ON public.trainer_payment_settings;
CREATE POLICY trainer_payment_settings_self_update ON public.trainer_payment_settings
    FOR UPDATE
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

-- ADMIN: irrestrito
DROP POLICY IF EXISTS trainer_payment_settings_admin_all ON public.trainer_payment_settings;
CREATE POLICY trainer_payment_settings_admin_all ON public.trainer_payment_settings
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 14. TABELA: subscription_plans
-- ==============================================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- PÚBLICO (ANON) E AUTENTICADO: pode ver planos disponíveis (página de preços)
DROP POLICY IF EXISTS subscription_plans_public_select ON public.subscription_plans;
CREATE POLICY subscription_plans_public_select ON public.subscription_plans
    FOR SELECT
    USING (true);

-- ADMIN: gerenciar planos (apenas admin pode criar/editar/deletar planos)
DROP POLICY IF EXISTS subscription_plans_admin_all ON public.subscription_plans;
CREATE POLICY subscription_plans_admin_all ON public.subscription_plans
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 15. TABELA: platform_webhook_events
-- ==============================================================================
ALTER TABLE public.platform_webhook_events ENABLE ROW LEVEL SECURITY;

-- ADMIN: irrestrito (webhooks são registrados por edge functions com service_role)
DROP POLICY IF EXISTS platform_webhook_events_admin_all ON public.platform_webhook_events;
CREATE POLICY platform_webhook_events_admin_all ON public.platform_webhook_events
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Nota: INSERT é feito por edge functions (service_role bypassa RLS).


-- ==============================================================================
-- 16. TABELA: app_presence (Presença no Chat)
-- ==============================================================================
ALTER TABLE public.app_presence ENABLE ROW LEVEL SECURITY;

-- PRÓPRIO USUÁRIO: upsert da própria presença
DROP POLICY IF EXISTS app_presence_self_upsert ON public.app_presence;
CREATE POLICY app_presence_self_upsert ON public.app_presence
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRAINER: ver presença dos seus alunos
DROP POLICY IF EXISTS app_presence_trainer_select ON public.app_presence;
CREATE POLICY app_presence_trainer_select ON public.app_presence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = app_presence.user_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS app_presence_admin_all ON public.app_presence;
CREATE POLICY app_presence_admin_all ON public.app_presence
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 17. EXERCISES — recreates policies (they existed before migrations)
-- ==============================================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercises_owner_insert ON public.exercises;
DROP POLICY IF EXISTS exercises_owner_update ON public.exercises;
DROP POLICY IF EXISTS exercises_owner_delete ON public.exercises;
DROP POLICY IF EXISTS exercises_select_public_or_owner ON public.exercises;

-- QUALQUER UM: ver exercícios públicos
DROP POLICY IF EXISTS exercises_select_public ON public.exercises;
CREATE POLICY exercises_select_public ON public.exercises
    FOR SELECT
    USING (is_public = true);

-- TRAINER: ver próprios exercícios (públicos ou próprios)
DROP POLICY IF EXISTS exercises_select_owner ON public.exercises;
CREATE POLICY exercises_select_owner ON public.exercises
    FOR SELECT
    USING (trainer_id = auth.uid());

-- TRAINER: gerenciar próprios exercícios
DROP POLICY IF EXISTS exercises_owner_insert ON public.exercises;
CREATE POLICY exercises_owner_insert ON public.exercises
    FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS exercises_owner_update ON public.exercises;
CREATE POLICY exercises_owner_update ON public.exercises
    FOR UPDATE
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS exercises_owner_delete ON public.exercises;
CREATE POLICY exercises_owner_delete ON public.exercises
    FOR DELETE
    USING (trainer_id = auth.uid());

-- ADMIN: irrestrito
DROP POLICY IF EXISTS exercises_admin_all ON public.exercises;
CREATE POLICY exercises_admin_all ON public.exercises
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 18. WORKOUT PLANS
-- ==============================================================================
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_plans_student_select_own ON public.workout_plans;
DROP POLICY IF EXISTS workout_plans_trainer_all ON public.workout_plans;

-- ALUNO: ver próprios planos
DROP POLICY IF EXISTS workout_plans_student_select ON public.workout_plans;
CREATE POLICY workout_plans_student_select ON public.workout_plans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_plans.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar planos dos seus alunos
CREATE POLICY workout_plans_trainer_all ON public.workout_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_plans.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_plans.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS workout_plans_admin_all ON public.workout_plans;
CREATE POLICY workout_plans_admin_all ON public.workout_plans
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 19. WORKOUT DAYS
-- ==============================================================================
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_days_student_select_own ON public.workout_days;
DROP POLICY IF EXISTS workout_days_trainer_all ON public.workout_days;

-- ALUNO: ver dias do seu plano
DROP POLICY IF EXISTS workout_days_student_select ON public.workout_days;
CREATE POLICY workout_days_student_select ON public.workout_days
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar dias dos planos dos seus alunos
CREATE POLICY workout_days_trainer_all ON public.workout_days
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS workout_days_admin_all ON public.workout_days;
CREATE POLICY workout_days_admin_all ON public.workout_days
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 20. WORKOUT PLAN EXERCISES
-- ==============================================================================
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_plan_exercises_student_select_own ON public.workout_plan_exercises;
DROP POLICY IF EXISTS workout_plan_exercises_trainer_all ON public.workout_plan_exercises;

-- ALUNO: ver exercícios do seu plano
DROP POLICY IF EXISTS workout_plan_exercises_student_select ON public.workout_plan_exercises;
CREATE POLICY workout_plan_exercises_student_select ON public.workout_plan_exercises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_plan_exercises.workout_plan_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar exercícios dos planos dos seus alunos
CREATE POLICY workout_plan_exercises_trainer_all ON public.workout_plan_exercises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_plan_exercises.workout_plan_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_plan_exercises.workout_plan_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS workout_plan_exercises_admin_all ON public.workout_plan_exercises;
CREATE POLICY workout_plan_exercises_admin_all ON public.workout_plan_exercises
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 21. WORKOUT EXERCISE GROUPS
-- ==============================================================================
ALTER TABLE public.workout_exercise_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_exercise_groups_student_select_own ON public.workout_exercise_groups;
DROP POLICY IF EXISTS workout_exercise_groups_trainer_all ON public.workout_exercise_groups;

-- ALUNO: ver grupos do seu plano
DROP POLICY IF EXISTS workout_exercise_groups_student_select ON public.workout_exercise_groups;
CREATE POLICY workout_exercise_groups_student_select ON public.workout_exercise_groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_days wd
            JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
            JOIN public.students s ON s.id = wp.student_id
            WHERE wd.id = workout_exercise_groups.workout_day_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar grupos dos planos dos seus alunos
DROP POLICY IF EXISTS workout_exercise_groups_trainer_all ON public.workout_exercise_groups;
CREATE POLICY workout_exercise_groups_trainer_all ON public.workout_exercise_groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_days wd
            JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
            JOIN public.students s ON s.id = wp.student_id
            WHERE wd.id = workout_exercise_groups.workout_day_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_days wd
            JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
            JOIN public.students s ON s.id = wp.student_id
            WHERE wd.id = workout_exercise_groups.workout_day_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS workout_exercise_groups_admin_all ON public.workout_exercise_groups;
CREATE POLICY workout_exercise_groups_admin_all ON public.workout_exercise_groups
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 22. WORKOUT LOGS
-- ==============================================================================
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_logs_student_all_own ON public.workout_logs;
DROP POLICY IF EXISTS workout_logs_trainer_all ON public.workout_logs;

-- ALUNO: gerenciar próprios logs
DROP POLICY IF EXISTS workout_logs_student_select ON public.workout_logs;
CREATE POLICY workout_logs_student_select ON public.workout_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_logs.student_id
              AND (s.auth_user_id = auth.uid() OR s.id = auth.uid()::uuid)
        )
    );

DROP POLICY IF EXISTS workout_logs_student_insert ON public.workout_logs;
CREATE POLICY workout_logs_student_insert ON public.workout_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_logs.student_id
              AND (s.auth_user_id = auth.uid() OR s.id = auth.uid()::uuid)
        )
    );

DROP POLICY IF EXISTS workout_logs_student_update ON public.workout_logs;
CREATE POLICY workout_logs_student_update ON public.workout_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_logs.student_id
              AND (s.auth_user_id = auth.uid() OR s.id = auth.uid()::uuid)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_logs.student_id
              AND (s.auth_user_id = auth.uid() OR s.id = auth.uid()::uuid)
        )
    );

-- TRAINER: ver logs dos seus alunos
DROP POLICY IF EXISTS workout_logs_trainer_select ON public.workout_logs;
CREATE POLICY workout_logs_trainer_select ON public.workout_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = workout_logs.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS workout_logs_admin_all ON public.workout_logs;
CREATE POLICY workout_logs_admin_all ON public.workout_logs
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 23. PAYMENTS
-- ==============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_access ON public.payments;
DROP POLICY IF EXISTS payments_trainer_access ON public.payments;
DROP POLICY IF EXISTS payments_trainer_all ON public.payments;
DROP POLICY IF EXISTS payments_student_select_own ON public.payments;

-- TRAINER: gerenciar pagamentos dos seus alunos
CREATE POLICY payments_trainer_all ON public.payments
    FOR ALL
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

-- ALUNO: ver próprios pagamentos (quando student_id está preenchido)
DROP POLICY IF EXISTS payments_student_select ON public.payments;
CREATE POLICY payments_student_select ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = payments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all ON public.payments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 24. STUDENT_PAYMENTS
-- ==============================================================================
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_payments_student_select_own ON public.student_payments;
DROP POLICY IF EXISTS student_payments_trainer_all ON public.student_payments;

-- ALUNO: ver próprios pagamentos (student_id é text, precisa de cast)
DROP POLICY IF EXISTS student_payments_student_select ON public.student_payments;
CREATE POLICY student_payments_student_select ON public.student_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar pagamentos dos seus alunos
CREATE POLICY student_payments_trainer_all ON public.student_payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS student_payments_admin_all ON public.student_payments;
CREATE POLICY student_payments_admin_all ON public.student_payments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 25. SUBSCRIPTIONS
-- ==============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_trainer_manage_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_trainer_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_trainer_update_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_student_select_own ON public.subscriptions;

-- ══════════════════════════════════════════════════════════════════════════════
-- REGRA DE OURO: NUNCA permitir que trainer altere plan_slug, status,
-- student_limit pelo frontend. Somente INSERT no cadastro inicial e
-- SELECT para leitura. Atualizações são feitas exclusivamente por:
--   - Edge functions (service_role bypassa RLS)
--   - Admin (is_admin())
-- ══════════════════════════════════════════════════════════════════════════════

-- TRAINER: ver própria assinatura
DROP POLICY IF EXISTS subscriptions_trainer_select ON public.subscriptions;
CREATE POLICY subscriptions_trainer_select ON public.subscriptions
    FOR SELECT
    USING (trainer_id = auth.uid());

-- TRAINER: criar própria assinatura (apenas no cadastro, com plan='free')
DROP POLICY IF EXISTS subscriptions_trainer_insert ON public.subscriptions;
CREATE POLICY subscriptions_trainer_insert ON public.subscriptions
    FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

-- ALUNO: ver assinatura do seu trainer
DROP POLICY IF EXISTS subscriptions_student_select ON public.subscriptions;
CREATE POLICY subscriptions_student_select ON public.subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.trainer_id = subscriptions.trainer_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS subscriptions_admin_all ON public.subscriptions;
CREATE POLICY subscriptions_admin_all ON public.subscriptions
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 26. SUBSCRIPTION EVENTS
-- ==============================================================================
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_events_user_select_own ON public.subscription_events;
DROP POLICY IF EXISTS subscription_events_trainer_all ON public.subscription_events;

-- PRÓPRIO USUÁRIO: ver eventos da sua assinatura
DROP POLICY IF EXISTS subscription_events_self_select ON public.subscription_events;
CREATE POLICY subscription_events_self_select ON public.subscription_events
    FOR SELECT
    USING (user_id = auth.uid());

-- TRAINER: ver eventos de assinatura dos seus alunos
DROP POLICY IF EXISTS subscription_events_trainer_select ON public.subscription_events;
CREATE POLICY subscription_events_trainer_select ON public.subscription_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.auth_user_id = subscription_events.user_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS subscription_events_admin_all ON public.subscription_events;
CREATE POLICY subscription_events_admin_all ON public.subscription_events
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 27. NUTRITION PLANS (recreate from 20260709150000)
-- ==============================================================================
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nutrition_plans_student_select_own ON public.nutrition_plans;
DROP POLICY IF EXISTS nutrition_plans_trainer_access ON public.nutrition_plans;
DROP POLICY IF EXISTS nutrition_plans_trainer_all ON public.nutrition_plans;

-- ALUNO: ver próprios planos nutricionais
DROP POLICY IF EXISTS nutrition_plans_student_select ON public.nutrition_plans;
CREATE POLICY nutrition_plans_student_select ON public.nutrition_plans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND s.auth_user_id = auth.uid()
        )
    );

-- TRAINER: gerenciar planos nutricionais dos seus alunos
CREATE POLICY nutrition_plans_trainer_all ON public.nutrition_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS nutrition_plans_admin_all ON public.nutrition_plans;
CREATE POLICY nutrition_plans_admin_all ON public.nutrition_plans
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 28. APPOINTMENTS (recreate from 20260709150000)
-- ==============================================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_personal_all ON public.appointments;
DROP POLICY IF EXISTS appointments_trainer_all ON public.appointments;
DROP POLICY IF EXISTS appointments_student_select_own ON public.appointments;

-- TRAINER: gerenciar agendamentos dos seus alunos
CREATE POLICY appointments_trainer_all ON public.appointments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ALUNO: ver próprios agendamentos
DROP POLICY IF EXISTS appointments_student_select ON public.appointments;
CREATE POLICY appointments_student_select ON public.appointments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS appointments_admin_all ON public.appointments;
CREATE POLICY appointments_admin_all ON public.appointments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 29. SUPPORT TICKETS (recreate from block5_rls_enable.sql + 20260709150000)
-- ==============================================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VSFit authenticated can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can read support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_insert_authenticated ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_update_own ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_delete_admin ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_trainer_all ON public.support_tickets;

-- PRÓPRIO USUÁRIO: ver e gerenciar próprios tickets
DROP POLICY IF EXISTS support_tickets_self_select ON public.support_tickets;
CREATE POLICY support_tickets_self_select ON public.support_tickets
    FOR SELECT
    USING (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    );

DROP POLICY IF EXISTS support_tickets_self_insert ON public.support_tickets;
CREATE POLICY support_tickets_self_insert ON public.support_tickets
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (requester_id = auth.uid()::text OR requester_email = auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS support_tickets_self_update ON public.support_tickets;
CREATE POLICY support_tickets_self_update ON public.support_tickets
    FOR UPDATE
    USING (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    );

-- TRAINER: ver e responder tickets dos seus alunos
DROP POLICY IF EXISTS support_tickets_trainer_all ON public.support_tickets;
CREATE POLICY support_tickets_trainer_all ON public.support_tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS support_tickets_admin_all ON public.support_tickets;
CREATE POLICY support_tickets_admin_all ON public.support_tickets
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 30. SUPPORT MESSAGES (recreate from block5_rls_enable.sql + 20260709150000)
-- ==============================================================================
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VSFit authenticated can delete support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can insert support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can update support messages" ON public.support_messages;
DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_update_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_delete_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_trainer_all ON public.support_messages;

-- PRÓPRIO USUÁRIO: ver, enviar e atualizar mensagens dos seus tickets
DROP POLICY IF EXISTS support_messages_self_select ON public.support_messages;
CREATE POLICY support_messages_self_select ON public.support_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
              AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email')
        )
    );

DROP POLICY IF EXISTS support_messages_self_insert ON public.support_messages;
CREATE POLICY support_messages_self_insert ON public.support_messages
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
              AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email')
        )
    );

DROP POLICY IF EXISTS support_messages_self_update ON public.support_messages;
CREATE POLICY support_messages_self_update ON public.support_messages
    FOR UPDATE
    USING (
        sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
    );

-- TRAINER: ver e responder mensagens dos tickets dos seus alunos
DROP POLICY IF EXISTS support_messages_trainer_all ON public.support_messages;
CREATE POLICY support_messages_trainer_all ON public.support_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
            WHERE t.id = support_messages.ticket_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
            WHERE t.id = support_messages.ticket_id
              AND s.trainer_id = auth.uid()
        )
    );

-- ADMIN: irrestrito
DROP POLICY IF EXISTS support_messages_admin_all ON public.support_messages;
CREATE POLICY support_messages_admin_all ON public.support_messages
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 31. TABELA: platform_subscription_payments (pagamentos da plataforma via gateway)
-- ==============================================================================
ALTER TABLE IF EXISTS public.platform_subscription_payments ENABLE ROW LEVEL SECURITY;

-- Apenas ADMIN pode ver e gerenciar pagamentos da plataforma.
-- Estes registros são criados por edge functions (service_role bypassa RLS).
DROP POLICY IF EXISTS platform_subscription_payments_admin_all ON public.platform_subscription_payments;
CREATE POLICY platform_subscription_payments_admin_all ON public.platform_subscription_payments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 32. TABELA: subscription_checkout_attempts (tentativas de checkout)
-- ==============================================================================
ALTER TABLE IF EXISTS public.subscription_checkout_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas ADMIN pode visualizar. Registros criados por edge functions.
DROP POLICY IF EXISTS subscription_checkout_attempts_admin_all ON public.subscription_checkout_attempts;
CREATE POLICY subscription_checkout_attempts_admin_all ON public.subscription_checkout_attempts
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ==============================================================================
-- 33. TABELAS ADICIONAIS (existem no schema público mas sem referência no app)
-- ==============================================================================
-- As tabelas abaixo são mencionadas na auditoria. O app não as consulta
-- diretamente (sem referências em .ts/.tsx), mas podem existir no schema.
-- Aplicamos RLS como segurança preventiva.
-- ==============================================================================

-- 33a. student_progress
ALTER TABLE IF EXISTS public.student_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_progress_self_select ON public.student_progress;
DROP POLICY IF EXISTS student_progress_trainer_all ON public.student_progress;
DROP POLICY IF EXISTS student_progress_admin_all ON public.student_progress;
CREATE POLICY student_progress_self_select ON public.student_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY student_progress_trainer_all ON public.student_progress
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY student_progress_admin_all ON public.student_progress
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 33b. historical_metrics
ALTER TABLE IF EXISTS public.historical_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS historical_metrics_self_select ON public.historical_metrics;
DROP POLICY IF EXISTS historical_metrics_trainer_all ON public.historical_metrics;
DROP POLICY IF EXISTS historical_metrics_admin_all ON public.historical_metrics;
CREATE POLICY historical_metrics_self_select ON public.historical_metrics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = historical_metrics.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY historical_metrics_trainer_all ON public.historical_metrics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = historical_metrics.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = historical_metrics.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY historical_metrics_admin_all ON public.historical_metrics
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 33c. body_measurements
ALTER TABLE IF EXISTS public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS body_measurements_self_select ON public.body_measurements;
DROP POLICY IF EXISTS body_measurements_trainer_all ON public.body_measurements;
DROP POLICY IF EXISTS body_measurements_admin_all ON public.body_measurements;
CREATE POLICY body_measurements_self_select ON public.body_measurements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = body_measurements.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY body_measurements_trainer_all ON public.body_measurements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = body_measurements.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = body_measurements.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY body_measurements_admin_all ON public.body_measurements
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 33d. student_progress_photos
ALTER TABLE IF EXISTS public.student_progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_progress_photos_self_select ON public.student_progress_photos;
DROP POLICY IF EXISTS student_progress_photos_trainer_all ON public.student_progress_photos;
DROP POLICY IF EXISTS student_progress_photos_admin_all ON public.student_progress_photos;
CREATE POLICY student_progress_photos_self_select ON public.student_progress_photos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress_photos.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY student_progress_photos_trainer_all ON public.student_progress_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress_photos.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_progress_photos.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY student_progress_photos_admin_all ON public.student_progress_photos
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 33e. student_achievements
ALTER TABLE IF EXISTS public.student_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_achievements_self_select ON public.student_achievements;
DROP POLICY IF EXISTS student_achievements_trainer_all ON public.student_achievements;
DROP POLICY IF EXISTS student_achievements_admin_all ON public.student_achievements;
CREATE POLICY student_achievements_self_select ON public.student_achievements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_achievements.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY student_achievements_trainer_all ON public.student_achievements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_achievements.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_achievements.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY student_achievements_admin_all ON public.student_achievements
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 33f. student_milestones
ALTER TABLE IF EXISTS public.student_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_milestones_self_select ON public.student_milestones;
DROP POLICY IF EXISTS student_milestones_trainer_all ON public.student_milestones;
DROP POLICY IF EXISTS student_milestones_admin_all ON public.student_milestones;
CREATE POLICY student_milestones_self_select ON public.student_milestones
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_milestones.student_id AND s.auth_user_id = auth.uid())
    );
CREATE POLICY student_milestones_trainer_all ON public.student_milestones
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_milestones.student_id AND s.trainer_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_milestones.student_id AND s.trainer_id = auth.uid())
    );
CREATE POLICY student_milestones_admin_all ON public.student_milestones
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==============================================================================
-- 34. TABELAS DEPRECATED (mantidas mas sem impacto no fluxo atual)
-- ==============================================================================
-- signup_links (old — substituída por coach_signup_links)
-- signup_link_visits (old — substituída pelo fluxo coach_signup_links)
--
-- Mantemos as policies existentes para não quebrar dados históricos.
-- Se desejar remover estas tabelas no futuro, execute:
--   DROP TABLE IF EXISTS public.signup_links CASCADE;
--   DROP TABLE IF EXISTS public.signup_link_visits CASCADE;


-- ==============================================================================
-- VERIFICAÇÕES PÓS-MIGRATION
-- ==============================================================================
-- Execute no SQL Editor do Supabase Dashboard:
--
-- 1. Todas as tabelas com RLS ativo:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys')
--    ORDER BY tablename;
--
-- 2. Todas as políticas criadas:
--    SELECT tablename, policyname, cmd, permissive
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
-- 3. Teste como anon (abrir console do navegador no /signup/:slug):
--    const { data } = await supabase.from('coach_signup_links').select('*').eq('slug','seu-slug').eq('is_active',true).maybeSingle();
--    const { data: trainer } = await supabase.from('trainer_profiles').select('name').eq('id', data.coach_auth_user_id).maybeSingle();
--
-- 4. Teste como personal autenticado:
--    const { data } = await supabase.from('students').select('*').limit(5);
--    (Deve retornar apenas os alunos deste trainer)
--
-- 5. Teste como aluno autenticado:
--    const { data } = await supabase.from('students').select('*').single();
--    (Deve retornar apenas o próprio registro)
