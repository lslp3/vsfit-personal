-- ==============================================================================
-- SPRINT 11 — E1 RLS OPERACIONAL (políticas manuais de comunicação)
-- Aplicação MANUAL no Supabase (SQL Editor) pelo usuário.
-- NÃO executado pelo agente. Nenhum ALTER é executado automaticamente.
--
-- Complementa/consolida supabase/sprint10_manual_policies.sql (definições
-- idênticas para os itens sobrepostos; aplicar um ou outro é idempotente
-- graças aos DROP POLICY IF EXISTS).
--
-- Corrige:
--   R2: notifications sem policy INSERT (trainerService, workoutExpirationService).
--   R2b: notifications INSERT do ALUNO para o personal (useWorkoutExecution —
--        "aluno finalizou o treino").
--   R4: messages sem policy UPDATE para o papel student (marcar como lida).
--   R5: notifications sem policy DELETE (botão Excluir do Personal).
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1) NOTIFICATIONS — policy INSERT (self-insert)
--    user_id = auth.uid() (quem insere é o dono da notificação).
--    Cobre: trainerService.createCrefNotification e
--           workoutExpirationService (notificações do próprio trainer).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS notifications_self_insert ON public.notifications;

    CREATE POLICY notifications_self_insert ON public.notifications
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) NOTIFICATIONS — policy INSERT (aluno → personal)
--    Aluno autenticado pode criar notificação cujo user_id é o trainer_id
--    do seu vínculo (students.auth_user_id = auth.uid()).
--    Cobre: useWorkoutExecution.ts:228 ("<Aluno> finalizou o treino").
--    NOTA: students.trainer_id = auth.uid() do personal (id do
--    trainer_profiles = auth uid), e notifications.user_id = auth uid do
--    RECEBEDOR — por isso user_id = s.trainer_id está correto.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS notifications_student_insert_for_trainer ON public.notifications;

    CREATE POLICY notifications_student_insert_for_trainer ON public.notifications
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.auth_user_id = auth.uid()
            AND notifications.user_id = s.trainer_id
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) MESSAGES — policy UPDATE para o aluno (marcar como lida)
--    Aluno pode atualizar somente mensagens da própria conversa
--    (students.id = messages.student_id e students.auth_user_id = auth.uid()).
--    O app envia apenas read = true; a coluna inteira fica sob RLS.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    DROP POLICY IF EXISTS messages_student_update ON public.messages;

    CREATE POLICY messages_student_update ON public.messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.auth_user_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = messages.student_id
            AND s.auth_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) NOTIFICATIONS — policy DELETE (self)
--    Usuário apaga somente as próprias notificações.
--    Cobre: botão "Excluir" da NotificationsView do Personal.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS notifications_self_delete ON public.notifications;

    CREATE POLICY notifications_self_delete ON public.notifications
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) QUERIES DE CONFERÊNCIA (executar após aplicar as policies acima)
-- ---------------------------------------------------------------------------

-- 5a) Políticas atuais de notifications e messages
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'messages')
ORDER BY tablename, policyname;

-- 5b) Publicação realtime (messages e notifications precisam estar aqui para
--     os canais postgres_changes do app dispararem)
SELECT pubname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Se `messages` NÃO aparecer no 5b (o chat realtime depende disso):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Se `notifications` NÃO aparecer no 5b (o realtime das páginas de
-- notificação depende disso):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
