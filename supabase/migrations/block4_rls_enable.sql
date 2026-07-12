-- =============================================
-- BLOCO 4: ATIVAÇÃO SEGURA DO RLS PARA PAGAMENTOS
-- Corrige políticas, remove duplicatas e ativa RLS
-- =============================================

-- 1. PAYMENTS TABELAS (já possui boas políticas - mantemos como estão)
-- Nenhuma alteração necessária - políticas já estão corretas:
-- payments_student_select_own: verifica se aluno é dono do pagamento
-- payments_trainer_all: (trainer_id = auth.uid() OR is_admin())

-- 2. STUDENT_PAYMENTS TABELAS (precisa de correção - tem políticas duplicadas e faltantes)
-- Remove políticas duplicadas/antigas (por segurança)
DROP POLICY IF EXISTS "Trainers can create own student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Trainers can view own student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Trainers can update own student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Trainers can delete own student payments" ON public.student_payments;
-- (Note: There appear to be duplicate versions of these policies - removing all variants)

-- Cria política para estudantes visualizarem seus próprios pagamentos
-- Relação: student_payments.student_id (text) -> students.id (uuid) via cast
CREATE POLICY student_payments_student_select_own ON public.student_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- Cria política para treinadores acessarem (ALL) pagamentos de seus alunos
-- Mesmo caminho de validação, mas para todas as operações
CREATE POLICY student_payments_trainer_all ON public.student_payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id::text = student_payments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- 3. SUBSCRIPTION_EVENTS TABELAS (precisa de políticas - nenhuma encontrada)
-- Cria política para usuários visualizarem seus próprios eventos de assinatura
-- Relação: subscription_events.user_id -> auth.uid() (direto, já que é uuid)
CREATE POLICY subscription_events_user_select_own ON public.subscription_events
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Cria política para treinadores acessarem (ALL) eventos de assinatura de seus alunos
-- Relação: subscription_events.user_id -> students.auth_user_id -> students.trainer_id = auth.uid()
CREATE POLICY subscription_events_trainer_all ON public.subscription_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.auth_user_id = subscription_events.user_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.auth_user_id = subscription_events.user_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- 4. ATIVAR RLS nas tabelas que ainda não o têm
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PASSOS DE VERIFICAÇÃO (execute após aplicar este script):
-- =============================================
-- 1. Teste login de estudante:
--    - Deve ver próprios pagamentos na tabela payments (via student_id)
--    - Deve ver próprios student_payments (se houver)
--    - Deve ver próprios subscription_events
--    - NÃO deve ver pagamentos/events de outros estudantes
-- 2. Teste login de treinador:
--    - Dever ver pagamentos de seus alunos (payments table)
--    - Dever ver student_payments de seus alunos
--    - Dever ver subscription_events de seus alunos
--    - NÃO deve ver pagamentos/events de alunos de outros treinadores
-- 3. Teste funções de admin: Deve conseguir ver/editar todos os dados
-- 4. Verifique que RLS está ativo:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'
--      AND tablename IN ('payments','student_payments','subscription_events',
--                       'platform_subscription_payments','platform_webhook_events',
--                      'subscription_checkout_attempts','trainer_payment_settings');
--    (Todas devem retornar 'true')
-- 5. Verifique especificamente as tabelas que estavam sem RLS/políticas:
--    SELECT * FROM public.payments LIMIT 1;  -- Deve funcionar sem erro
--    SELECT * FROM public.student_payments LIMIT 1;  -- Deve funcionar sem erro
--    SELECT * FROM public.subscription_events LIMIT 1;  -- Deve funcionar sem erro
-- 6. Verifique que políticas duplicadas foram removidas:
--    SELECT policyname FROM pg_policies 
--    WHERE tablename = 'student_payments' 
--    GROUP BY policyname 
--    HAVING COUNT(*) > 1;
--    (Deve retornar zero linhas)
-- =============================================