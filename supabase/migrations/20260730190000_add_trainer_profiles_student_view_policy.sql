-- ==============================================================================
-- VS Fit Personal — Policy: student can view linked trainer profile
-- ==============================================================================
--
-- O chat do aluno precisa buscar trainer_profiles pelo trainer_id.
-- Aluno autenticado pode visualizar apenas o trainer_profiles vinculado via:
--   students.auth_user_id = auth.uid()
--   students.trainer_id   = trainer_profiles.id
-- ==============================================================================

DROP POLICY IF EXISTS trainer_profiles_student_view_trainer ON public.trainer_profiles;

CREATE POLICY trainer_profiles_student_view_trainer ON public.trainer_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.students s
            WHERE s.trainer_id = trainer_profiles.id
              AND s.auth_user_id = auth.uid()
        )
    );
