-- =============================================
-- FIX: appointments - Corrigir policy para usar trainer_id via students
-- =============================================
-- A policy atual usa coach_email (email) que não é confiável
-- Deve usar student_id -> students.trainer_id = auth.uid()

DROP POLICY IF EXISTS appointments_personal_all ON public.appointments;

-- Policy para treinador: pode gerenciar agendamentos dos seus alunos
CREATE POLICY appointments_trainer_all ON public.appointments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- Policy para aluno: pode ver seus próprios agendamentos
CREATE POLICY appointments_student_select_own ON public.appointments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = appointments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- =============================================
-- FIX: subscriptions - Adicionar policy para aluno ver sua assinatura
-- =============================================
-- A assinatura pertence ao trainer, mas o aluno deve poder ver a do seu trainer

CREATE POLICY subscriptions_student_select_own ON public.subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.trainer_id = subscriptions.trainer_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- =============================================
-- FIX: notifications - Adicionar policy para trainer ver notificações dos alunos
-- =============================================
-- Trainer deve ver notificações dos seus alunos (user_id = student.auth_user_id)

CREATE POLICY notifications_trainer_view_students ON public.notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.auth_user_id = notifications.user_id
              AND s.trainer_id = auth.uid()
        )
    );

-- =============================================
-- FIX: payments - Remover duplicata e adicionar policy para aluno
-- =============================================
-- Existe payments_access e payments_trainer_access duplicados
-- payments tem trainer_id e student_id

DROP POLICY IF EXISTS payments_access ON public.payments;
DROP POLICY IF EXISTS payments_trainer_access ON public.payments;

-- Policy para treinador: pode gerenciar pagamentos dos seus alunos
CREATE POLICY payments_trainer_all ON public.payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = payments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = payments.student_id
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- Policy para aluno: pode ver seus próprios pagamentos
CREATE POLICY payments_student_select_own ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = payments.student_id
              AND s.auth_user_id = auth.uid()
        )
    );

-- =============================================
-- FIX: support_tickets - Adicionar policy para trainer responder
-- =============================================
-- Trainer do aluno deve poder ver/atualizar tickets

CREATE POLICY support_tickets_trainer_all ON public.support_tickets
    FOR ALL
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id::text = support_tickets.requester_id OR s.email = support_tickets.requester_email)
              AND s.trainer_id = auth.uid()
        )
    );

-- =============================================
-- FIX: support_messages - Adicionar policy para trainer
-- =============================================

CREATE POLICY support_messages_trainer_all ON public.support_messages
    FOR ALL
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM public.support_tickets t
            JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
            WHERE t.id = support_messages.ticket_id
              AND s.trainer_id = auth.uid()
        )
    )
    WITH CHECK (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM public.support_tickets t
            JOIN public.students s ON (s.id::text = t.requester_id OR s.email = t.requester_email)
            WHERE t.id = support_messages.ticket_id
              AND s.trainer_id = auth.uid()
        )
    );

-- =============================================
-- FIX: nutrition_plans - Corrigir para usar trainer_id via students
-- =============================================
-- Tem student_id (uuid), studentid (text), coach_email
-- Deve usar student_id -> students.trainer_id

DROP POLICY IF EXISTS nutrition_plans_student_select_own ON public.nutrition_plans;
DROP POLICY IF EXISTS nutrition_plans_trainer_access ON public.nutrition_plans;

-- Policy para aluno: ver seus próprios planos (via student_id ou studentid)
CREATE POLICY nutrition_plans_student_select_own ON public.nutrition_plans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND s.auth_user_id = auth.uid()
        )
    );

-- Policy para trainer: gerenciar planos dos seus alunos
CREATE POLICY nutrition_plans_trainer_all ON public.nutrition_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = nutrition_plans.student_id OR s.id::text = nutrition_plans.studentid)
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );

-- =============================================
-- FIX: user_profiles - Verificar se aluno pode ver perfil do trainer
-- =============================================
-- trainer_profiles já foi corrigido, user_profiles pode precisar de policy similar
-- user_profiles tem id, email, name, role

-- Adicionar policy para aluno ver user_profile do seu trainer (se role = 'personal')
CREATE POLICY user_profiles_student_view_trainer ON public.user_profiles
    FOR SELECT
    USING (
        role = 'personal'
        AND EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.trainer_profiles tp ON tp.id = s.trainer_id
            WHERE tp.id = user_profiles.id
              AND s.auth_user_id = auth.uid()
        )
    );