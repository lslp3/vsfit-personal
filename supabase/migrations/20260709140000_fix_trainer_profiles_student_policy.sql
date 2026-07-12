-- =============================================
-- FIX: Permitir que aluno veja perfil do seu treinador
-- O chat do aluno precisa buscar trainer_profiles pelo trainer_id
-- mas a policy atual só permite o próprio treinador (id = auth.uid())
-- =============================================

-- Política para alunos verem o perfil do seu treinador vinculado
CREATE POLICY trainer_profiles_student_view_trainer ON public.trainer_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.trainer_id = trainer_profiles.id
              AND s.auth_user_id = auth.uid()
        )
    );

-- =============================================
-- VERIFICAÇÃO (execute após aplicar):
-- =============================================
-- 1. Verifique se a policy foi criada:
--    SELECT policyname, cmd, permissive, roles, qual 
--    FROM pg_policies 
--    WHERE tablename = 'trainer_profiles' AND schemaname = 'public';
--
-- 2. Teste como aluno:
--    SELECT * FROM trainer_profiles WHERE id = 'SEU_TRAINER_ID';
--    (Deve funcionar se o aluno estiver vinculado a esse trainer_id)