-- =============================================
-- BLOCO 5: ATIVAÇÃO SEGURA DO RLS PARA CADASTROS E SUPORTE
-- Habilita RLS, corrige políticas de segurança e remove acessos excessivos
-- =============================================

-- =============================================
-- 1. SIGNUP_LINKS (Links de Inscrição)
-- =============================================
ALTER TABLE public.signup_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_links_select_active_public ON public.signup_links;
DROP POLICY IF EXISTS signup_links_trainer_all ON public.signup_links;

-- Qualquer um pode visualizar links ativos para se cadastrar, ou o treinador dono, ou admin
CREATE POLICY signup_links_select_active_public ON public.signup_links
    FOR SELECT
    USING (is_active = true OR trainer_id = auth.uid() OR is_admin());

-- Apenas o treinador dono ou admin pode gerenciar (criar, atualizar, deletar) os links
CREATE POLICY signup_links_trainer_all ON public.signup_links
    FOR ALL
    USING (trainer_id = auth.uid() OR is_admin())
    WITH CHECK (trainer_id = auth.uid() OR is_admin());


-- =============================================
-- 2. SIGNUP_LINK_VISITS (Visitas aos Links)
-- =============================================
ALTER TABLE public.signup_link_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_link_visits_public_insert ON public.signup_link_visits;
DROP POLICY IF EXISTS signup_link_visits_trainer_select ON public.signup_link_visits;

-- Qualquer visitante anônimo pode registrar uma visita
CREATE POLICY signup_link_visits_public_insert ON public.signup_link_visits
    FOR INSERT
    WITH CHECK (true);

-- Apenas o treinador dono do link ou admin pode ver as estatísticas de visita
CREATE POLICY signup_link_visits_trainer_select ON public.signup_link_visits
    FOR SELECT
    USING (trainer_id = auth.uid() OR is_admin());


-- =============================================
-- 3. SIGNUP_LEADS (Interesses / Leads de Cadastro)
-- =============================================
ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_leads_public_insert ON public.signup_leads;
DROP POLICY IF EXISTS signup_leads_trainer_all ON public.signup_leads;

-- Qualquer pessoa na página de cadastro pode enviar seus dados como Lead
CREATE POLICY signup_leads_public_insert ON public.signup_leads
    FOR INSERT
    WITH CHECK (true);

-- Apenas o treinador do lead ou admin pode gerenciar/ver os dados dos leads
CREATE POLICY signup_leads_trainer_all ON public.signup_leads
    FOR ALL
    USING (trainer_id = auth.uid() OR is_admin())
    WITH CHECK (trainer_id = auth.uid() OR is_admin());


-- =============================================
-- 4. STUDENT_ACCOUNTS (Contas de Acesso dos Alunos)
-- =============================================
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_accounts_select_own ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_update_own_student ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_insert_own_student ON public.student_accounts;
DROP POLICY IF EXISTS student_accounts_delete_own_student ON public.student_accounts;

-- Permite leitura para admin, treinador associado, ou para o próprio aluno
CREATE POLICY student_accounts_select_own ON public.student_accounts
    FOR SELECT
    USING (
        is_admin() 
        OR trainer_id = auth.uid() 
        OR auth_user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_accounts.student_id 
              AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
    );

-- Permite atualização para admin, treinador, para o próprio aluno autenticado,
-- ou com base no email (caso o aluno esteja logando pela primeira vez para vincular o auth_user_id)
CREATE POLICY student_accounts_update_own_student ON public.student_accounts
    FOR UPDATE
    USING (
        is_admin() 
        OR trainer_id = auth.uid() 
        OR auth_user_id = auth.uid() 
        OR email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_accounts.student_id 
              AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
    )
    WITH CHECK (
        is_admin() 
        OR trainer_id = auth.uid() 
        OR auth_user_id = auth.uid() 
        OR email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_accounts.student_id 
              AND (s.trainer_id = auth.uid() OR s.auth_user_id = auth.uid())
        )
    );

-- Apenas admin ou treinador associado ao aluno pode inserir/gerar contas de acesso
CREATE POLICY student_accounts_insert_own_student ON public.student_accounts
    FOR INSERT
    WITH CHECK (
        is_admin() 
        OR trainer_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_accounts.student_id 
              AND s.trainer_id = auth.uid()
        )
    );

-- Apenas admin ou treinador associado ao aluno pode excluir contas de acesso
CREATE POLICY student_accounts_delete_own_student ON public.student_accounts
    FOR DELETE
    USING (
        is_admin() 
        OR trainer_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.students s 
            WHERE s.id = student_accounts.student_id 
              AND s.trainer_id = auth.uid()
        )
    );


-- =============================================
-- 5. SUPPORT_TICKETS (Tickets de Suporte)
-- =============================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas públicas/inseguras anteriores
DROP POLICY IF EXISTS "VSFit authenticated can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can read support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "VSFit authenticated can update support tickets" ON public.support_tickets;

DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_insert_authenticated ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_update_own ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_delete_admin ON public.support_tickets;

-- Usuários leem apenas seus próprios tickets (pelo requester_id ou email), ou admin lê todos
CREATE POLICY support_tickets_select_own ON public.support_tickets
    FOR SELECT
    USING (
        is_admin()
        OR requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    );

-- Qualquer usuário autenticado pode abrir um ticket (desde que defina a si mesmo como solicitante)
CREATE POLICY support_tickets_insert_authenticated ON public.support_tickets
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            requester_id = auth.uid()::text
            OR requester_email = auth.jwt() ->> 'email'
            OR is_admin()
        )
    );

-- Apenas o solicitante original ou admin pode atualizar o ticket
CREATE POLICY support_tickets_update_own ON public.support_tickets
    FOR UPDATE
    USING (
        is_admin()
        OR requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        is_admin()
        OR requester_id = auth.uid()::text
        OR requester_email = auth.jwt() ->> 'email'
    );

-- Apenas administradores podem excluir tickets de suporte
CREATE POLICY support_tickets_delete_admin ON public.support_tickets
    FOR DELETE
    USING (is_admin());


-- =============================================
-- 6. SUPPORT_MESSAGES (Mensagens dos Tickets de Suporte)
-- =============================================
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas públicas/inseguras anteriores
DROP POLICY IF EXISTS "VSFit authenticated can delete support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can insert support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "VSFit authenticated can update support messages" ON public.support_messages;

DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_update_own ON public.support_messages;
DROP POLICY IF EXISTS support_messages_delete_admin ON public.support_messages;

-- Permite ver mensagens se pertencerem a um ticket ao qual o usuário tem acesso
CREATE POLICY support_messages_select_own ON public.support_messages
    FOR SELECT
    USING (
        is_admin()
        OR sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
              AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email' OR is_admin())
        )
    );

-- Permite enviar mensagens no ticket se o usuário for o dono/solicitante do ticket ou admin
CREATE POLICY support_messages_insert_own ON public.support_messages
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
              AND (t.requester_id = auth.uid()::text OR t.requester_email = auth.jwt() ->> 'email' OR is_admin())
        )
    );

-- Permite atualizar própria mensagem enviada ou por admin
CREATE POLICY support_messages_update_own ON public.support_messages
    FOR UPDATE
    USING (
        is_admin()
        OR sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        is_admin()
        OR sender_id = auth.uid()::text
        OR sender_email = auth.jwt() ->> 'email'
    );

-- Apenas administradores podem excluir mensagens do suporte
CREATE POLICY support_messages_delete_admin ON public.support_messages
    FOR DELETE
    USING (is_admin());
