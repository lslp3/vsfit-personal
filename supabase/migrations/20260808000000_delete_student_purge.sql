-- ============================================================================
-- VSFit Personal — Exclusão segura de aluno · RPC TRANSACIONAL de purga
-- ============================================================================
-- PADRÃO: migration versionada (siga o estilo de 20260731000000 e
-- 20260802000000...). Aplicar manualmente no Supabase SQL Editor — NUNCA
-- executar automaticamente. Idempotente (CREATE OR REPLACE / IF EXISTS).
--
-- CONTEXTO:
--   • O frontend NÃO executa DELETE em students. O ÚNICO ponto de entrada
--     é a Edge Function `delete-student`, que usa a chave service_role para
--     chamar esta RPC.
--   • A RPC é SECURITY DEFINER: roda como owner (postgres), por isso precisa
--     SET search_path explícito e validação de ownership DENTRO da função.
--   • auth.uid() NÃO pode ser usado aqui de forma confiável: chamadas via
--     service_role não carregam JWT de usuário. Por isso o trainer UUID vem
--     como parâmetro (resolvido pela Edge Function a partir do JWT do
--     personal autenticado e verificado) e a RPC RE-valida o ownership
--     lendo students.trainer_id.
--   • EXECUTE é revogado de PUBLIC/anon/authenticated — apenas service_role
--     consegue invocar. O usuário/app NÃO pode chamar a RPC diretamente
--     (sem bypass da Edge Function).
--   • NÃO adiciona CASCADE. NÃO altera RLS existente. NÃO mexe em dados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNÇÃO delete_student_data(uuid, uuid)
-- ----------------------------------------------------------------------------
-- Parâmetros:
--   p_student_uuid uuid — students.id do aluno a remover
--   p_trainer_uuid uuid — auth.uid()/trainer_profiles.id do personal autenticado
--
-- Comportamento:
--   • valida ownership (students.trainer_id = p_trainer_uuid);
--   • apaga TODOS os dados associados, em ordem de dependência (filhos antes
--     de pais — evita órfãos e violações de FK RESTRICT);
--   • students é removido por ÚLTIMO;
--   • qualquer erro → RAISE EXCEPTION → rollback completo da transação;
--   • tabelas/colunas inexistentes são ignoradas (to_regclass +
--     information_schema) — o schema nunca versiona CREATE TABLE;
--   • tabelas legadas com student_id TEXT comparem via ::text cast.
--
-- RETORNO: void (nenhum dado sensível é exposto ao chamador).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_student_data(
    p_student_uuid uuid,
    p_trainer_uuid uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
    v_has_student_id boolean;
BEGIN
    -- ----------------------------------------------------------------------
    -- 0. VALIDAÇÃO DE OWNERSHIP (anti-vazamento entre trainers)
    -- ----------------------------------------------------------------------
    IF p_student_uuid IS NULL OR p_trainer_uuid IS NULL THEN
        RAISE EXCEPTION 'delete_student: parâmetros obrigatórios ausentes';
    END IF;

    SELECT s.trainer_id
      INTO v_owner
      FROM public.students s
     WHERE s.id = p_student_uuid;

    IF v_owner IS NULL OR v_owner <> p_trainer_uuid THEN
        RAISE EXCEPTION 'delete_student: aluno não encontrado ou não pertence ao personal logado';
    END IF;

    -- ----------------------------------------------------------------------
    -- A. TREINOS (workout_*) — dependências ANTES do plano
    -- ----------------------------------------------------------------------
    IF to_regclass('public.workout_plan_exercises') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'workout_plan_exercises'
                      AND column_name = 'workout_plan_id')
    THEN
        DELETE FROM public.workout_plan_exercises
         WHERE workout_plan_id IN (
             SELECT id FROM public.workout_plans
              WHERE student_id = p_student_uuid
         );
    END IF;

    IF to_regclass('public.workout_exercise_groups') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'workout_exercise_groups'
                      AND column_name = 'workout_plan_id')
    THEN
        DELETE FROM public.workout_exercise_groups
         WHERE workout_plan_id IN (
             SELECT id FROM public.workout_plans
              WHERE student_id = p_student_uuid
         );
    END IF;

    IF to_regclass('public.workout_days') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'workout_days'
                      AND column_name = 'workout_plan_id')
    THEN
        DELETE FROM public.workout_days
         WHERE workout_plan_id IN (
             SELECT id FROM public.workout_plans
              WHERE student_id = p_student_uuid
         );
    END IF;

    IF to_regclass('public.workout_plans') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'workout_plans'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.workout_plans
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.workout_logs') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'workout_logs'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.workout_logs
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- B. PROGRESSO / AVALIAÇÕES
    -- ----------------------------------------------------------------------
    IF to_regclass('public.student_progress_photos') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_progress_photos'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_progress_photos
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.progress_photos') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'progress_photos'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.progress_photos
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_progress') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_progress'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_progress
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_metrics') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_metrics'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_metrics
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- C. METAS / CONQUISTAS / HISTÓRICOS
    -- ----------------------------------------------------------------------
    IF to_regclass('public.student_goals') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_goals'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_goals
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_milestones') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_milestones'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_milestones
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_achievements') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_achievements'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_achievements
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_statistics') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_statistics'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_statistics
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.progress_activities') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'progress_activities'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.progress_activities
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.water_tracking') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'water_tracking'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.water_tracking
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.body_measurements') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'body_measurements'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.body_measurements
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.historical_metrics') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'historical_metrics'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.historical_metrics
         WHERE student_id = p_student_uuid;
    END IF;

    -- student_history: student_id TEXT (legado) → cast seguro
    IF to_regclass('public.student_history') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_history'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_history
         WHERE student_id::text = p_student_uuid::text;
    END IF;

    -- ----------------------------------------------------------------------
    -- D. PAGAMENTOS (estrutura dupla: payments UUID + student_payments TEXT)
    -- ----------------------------------------------------------------------
    IF to_regclass('public.student_payments') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_payments'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_payments
         WHERE student_id::text = p_student_uuid::text;
    END IF;

    IF to_regclass('public.payments') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'payments'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.payments
         WHERE student_id = p_student_uuid;
    END IF;

    -- invoices: primeira apaga as faturas do aluno (invoices.student_id);
    -- payments.invoice_id já não existe mais (apagado acima) → sem FK órfã.
    IF to_regclass('public.invoices') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'invoices'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.invoices
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- E. NUTRIÇÃO
    -- ----------------------------------------------------------------------
    IF to_regclass('public.nutrition_plans') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'nutrition_plans'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.nutrition_plans
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- F. MENSAGENS (messages = canônica; chat_messages = legado)
    -- ----------------------------------------------------------------------
    IF to_regclass('public.messages') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'messages'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.messages
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.chat_messages') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'chat_messages'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.chat_messages
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- G. AGENDA / PRESENÇA / CONVITES
    -- ----------------------------------------------------------------------
    IF to_regclass('public.appointments') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'appointments'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.appointments
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.app_presence') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'app_presence'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.app_presence
         WHERE student_id = p_student_uuid;
    END IF;

    IF to_regclass('public.student_access_invites') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_access_invites'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_access_invites
         WHERE student_id = p_student_uuid;
    END IF;

    -- ----------------------------------------------------------------------
    -- H. ACESSO (student_accounts) e, por último, STUDENTS
    -- ----------------------------------------------------------------------
    IF to_regclass('public.student_accounts') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'student_accounts'
                      AND column_name = 'student_id')
    THEN
        DELETE FROM public.student_accounts
         WHERE student_id = p_student_uuid;
    END IF;

    DELETE FROM public.students
     WHERE id = p_student_uuid
       AND trainer_id = p_trainer_uuid;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. SEGURANÇA — EXECUTE somente para service_role (sem bypass pela app)
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.delete_student_data(uuid, uuid)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_student_data(uuid, uuid)
    TO service_role;

-- ----------------------------------------------------------------------------
-- NOTAS
-- ----------------------------------------------------------------------------
-- • NÃO adiciona ON DELETE CASCADE nem altera RLS existente.
-- • Idempotente: CREATE OR REPLACE; tabelas ausentes são ignoradas;
--   student já removido → SELECT INTO v_owner NULL → RAISE (404 mapeado
--   pela Edge Function). Nenhum DELETE é executado nesse caso.
-- • A borda entre banco e Auth: esta RPC NUNCA toca auth.users — quem
--   remove o usuário Supabase Auth é a Edge Function, DEPOIS do commit
--   desta transação (Fase B), via admin.auth.admin.deleteUser.
-- ============================================================================