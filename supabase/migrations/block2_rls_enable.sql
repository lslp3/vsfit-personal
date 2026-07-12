-- =============================================
-- BLOCO 2: ATIVAÇÃO SEGURA DO RLS (ESQUEMA VERIFICADO)
-- Baseado exatamente nas consultas de schema realizadas
-- =============================================

-- 1. EXERCISES (mantém políticas existentes - já estão corretas conforme verificação)
-- Nenhuma alteração necessária - políticas já estão corretas:
-- exercises_owner_insert/update/delete: (trainer_id = auth.uid() OR is_admin())
-- exercises_select_public_or_owner: (is_public = true OR trainer_id = auth.uid() OR is_admin())

-- 2. WORKOUT_LOGS (mantém políticas existentes - já estão corretas conforme verificação)
-- Nenhuma alteração necessária - políticas já estão corretas:
-- workout_logs_student_all_own: verifica se aluno pertence ao usuário atual
-- workout_logs_trainer_all: (trainer_id = auth.uid() OR is_admin())

-- 3. WORKOUT_PLAN_EXERCISES (mantém políticas existentes - já estão corretas conforme verificação)
-- Nenhuma alteração necessária - políticas já estão corretas:
-- workout_plan_exercises_student_select_own: verifica via workout_plans -> students -> auth.uid()
-- workout_plan_exercises_trainer_all: verifica se plano pertence ao treinador ou admin

-- 4. WORKOUT_PLANS (mantém políticas existentes - já estão corretas conforme verificação)
-- Nenhuma alteração necessária - políticas já estão corretas:
-- workout_plans_student_select_own: verifica se plano pertence ao aluno do usuário
-- workout_plans_trainer_all: (trainer_id = auth.uid() OR is_admin())

-- 5. WORKOUT_DAYS (adiciona políticas faltantes - esquema verificado)
-- Colunas confirmadas: id (uuid), workout_plan_id (uuid) referencing workout_plans.id
-- Remove qualquer política potencialmente incorreta (por segurança)
DROP POLICY IF EXISTS workout_days_trainer_all ON public.workout_days;
DROP POLICY IF EXISTS workout_days_student_select_own ON public.workout_days;

-- Cria política para alunos visualizarem seus próprios dias de treino
-- Path: workout_days.workout_plan_id -> workout_plans.id -> workout_plans.student_id -> students.id -> students.auth_user_id = auth.uid()
CREATE POLICY workout_days_student_select_own ON public.workout_days
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- Cria política para treinadores acessarem todos os dias de treino de seus alunos
-- Mesmo caminho, mas verificando trainer_id dos alunos
CREATE POLICY workout_days_trainer_all ON public.workout_days
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_plans wp
            JOIN public.students s ON s.id = wp.student_id
            WHERE wp.id = workout_days.workout_plan_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- 6. WORKOUT_EXERCISE_GROUPS (adiciona políticas faltantes - esquema verificado)
-- Colunas confirmadas: id (uuid), workout_day_id (uuid) referencing workout_days.id, workout_plan_id (uuid) referencing workout_plans.id
-- Removemos qualquer política potencialmente incorreta (por segurança)
DROP POLICY IF EXISTS workout_exercise_groups_trainer_all ON public.workout_exercise_groups;
DROP POLICY IF EXISTS workout_exercise_groups_student_select_own ON public.workout_exercise_groups;

-- Cria política para alunos visualizarem seus próprios grupos de exercícios
-- Usamos o caminho mais direto: workout_exercise_groups.workout_day_id -> workout_days.id -> ... -> students
-- (Evita join desnecessário com workout_plan_exercises já que temos workout_day_id direto)
CREATE POLICY workout_exercise_groups_student_select_own ON public.workout_exercise_groups
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

-- Cria política para treinadores acessarem todos os grupos de exercícios de seus alunos
-- Mesmo caminho de validação
CREATE POLICY workout_exercise_groups_trainer_all ON public.workout_exercise_groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_days wd
            JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
            JOIN public.students s ON s.id = wp.student_id
            WHERE wd.id = workout_exercise_groups.workout_day_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_days wd
            JOIN public.workout_plans wp ON wp.id = wd.workout_plan_id
            JOIN public.students s ON s.id = wp.student_id
            WHERE wd.id = workout_exercise_groups.workout_day_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- 7. ATIVAR RLS em todas as tabelas do Bloco 2
-- (Agora que todas têm políticas adequadas conforme verificação de schema)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PASSOS DE VERIFICAÇÃO (execute após aplicar este script):
-- =============================================
-- 1. Teste login de treinador: Deve conseguir ver/planejar/editar treinos de seus alunos
-- 2. Teste login de aluno: Deve ver apenas seus próprios treinos e marcar como concluídos
-- 3. Teste funções de admin: Deve conseguir ver/editar todos os dados
-- 4. Verifique que RLS está ativo: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
-- 5. Teste especificamente as tabelas que estavam sem políticas:
--    SELECT * FROM public.workout_days LIMIT 1;  -- Deve funcionar sem erro
--    SELECT * FROM public.workout_exercise_groups LIMIT 1;  -- Deve funcionar sem erro
-- 6. Verifique políticas criadas:
--    SELECT policyname, cmd, permissive FROM pg_policies 
--    WHERE tablename IN ('workout_days', 'workout_exercise_groups') AND schemaname = 'public';
-- =============================================