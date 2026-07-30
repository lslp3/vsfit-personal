-- =============================================
-- FIX: Public signup RLS — evitar "permission denied for table students"
-- =============================================
-- Problema: A policy trainer_profiles_student_view_trainer faz subquery
-- em students, que não tem política para anon. Quando a página pública
-- /signup/:slug consulta trainer_profiles com chave anon, o PostgreSQL
-- avalia a subquery em students e retorna permission denied.
--
-- Solução:
--   1. Policy pública em coach_signup_links para SELECT de links ativos
--   2. Policy pública em trainer_profiles para leitura via signup link
--      (sem referenciar students — usa coach_signup_links.is_active)
-- =============================================

-- =============================================
-- 1. COACH_SIGNUP_LINKS — leitura pública de links ativos
-- =============================================
-- Permite que visitantes anônimos encontrem links de cadastro ativos pelo slug
DROP POLICY IF EXISTS coach_signup_links_public_select ON public.coach_signup_links;
CREATE POLICY coach_signup_links_public_select
    ON public.coach_signup_links
    FOR SELECT
    USING (is_active = true);

-- Policy para o treinador dono gerenciar seus próprios links
DROP POLICY IF EXISTS coach_signup_links_owner_all ON public.coach_signup_links;
CREATE POLICY coach_signup_links_owner_all
    ON public.coach_signup_links
    FOR ALL
    USING (coach_auth_user_id = auth.uid())
    WITH CHECK (coach_auth_user_id = auth.uid());


-- =============================================
-- 2. TRAINER_PROFILES — leitura pública via signup link ativo
-- =============================================
-- Policy para leitura pública: permite anon ver perfil do personal
-- apenas se ele tiver um link de cadastro ativo.
-- NÃO referencia students — resolve o permission denied.
DROP POLICY IF EXISTS trainer_profiles_public_signup_read ON public.trainer_profiles;
CREATE POLICY trainer_profiles_public_signup_read
    ON public.trainer_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.coach_signup_links csl
            WHERE csl.coach_auth_user_id = trainer_profiles.id
              AND csl.is_active = true
        )
    );
