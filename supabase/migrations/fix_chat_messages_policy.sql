-- =============================================
-- BLOCO 3: CORREÇÃO DE POLÍTICA PARA CHAT_MESSAGES
-- Suporta tanto student_id (uuid) quanto studentid (text)
-- =============================================

-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS chat_messages_student_all_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_trainer_all ON public.chat_messages;

-- Cria nova política para estudantes (ALL)
-- Permite se o estudiante for o dono da mensagem, verificando tanto student_id (uuid) quanto studentid (text)
CREATE POLICY chat_messages_student_all_own ON public.chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.students s
            WHERE 
                (s.id = chat_messages.student_id AND s.auth_user_id = auth.uid()) OR
                (s.id::text = chat_messages.studentid AND s.auth_user_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.students s
            WHERE 
                (s.id = chat_messages.student_id AND s.auth_user_id = auth.uid()) OR
                (s.id::text = chat_messages.studentid AND s.auth_user_id = auth.uid())
        )
    );

-- Cria nova política para treinadores (ALL)
-- Permite se o treinador for o responsável pelo estudante, verificando ambos os campos
CREATE POLICY chat_messages_trainer_all ON public.chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.students s
            WHERE 
                (s.id = chat_messages.student_id AND s.trainer_id = auth.uid()) OR
                (s.id::text = chat_messages.studentid AND s.trainer_id = auth.uid()) OR
                is_admin()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.students s
            WHERE 
                (s.id = chat_messages.student_id AND s.trainer_id = auth.uid()) OR
                (s.id::text = chat_messages.studentid AND s.trainer_id = auth.uid()) OR
                is_admin()
        )
    );

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- Após aplicar, teste:
-- 1. Inserir uma mensagem de chat como estudante (deve funcionar)
-- 2. Inserir uma mensagem de chat como treinador para seu aluno (deve funcionar)
-- 3. Selecionar mensagens como estudante (deve ver apenas as suas)
-- 4. Selecionar mensagens como treinador (deve ver mensagens de seus alunos)
-- 5. Verificar que nenhum erro de política aparece
-- =============================================