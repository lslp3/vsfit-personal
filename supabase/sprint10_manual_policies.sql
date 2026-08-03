-- ==============================================================================
-- SPRINT 10.1 — CONSOLIDAÇÃO DO MÓDULO DE COMUNICAÇÃO
-- SQL de aplicação MANUAL no Supabase (SQL Editor)
-- NÃO executado pelo agente (banco congelado; aplicação manual pelo usuário).
--
-- Corrige:
--   R2: notifications sem policy INSERT -> notificações inseridas são rejeitadas
--       silenciosamente. (trainerService.createCrefNotification e
--       workoutExpirationService inserem com user_id = próprio auth.uid(),
--       ou seja, notificações self.)
--   R4: aluno não consegue marcar mensagens como lidas (não existe policy
--       UPDATE de messages para o papel aluno) -> o indicador de leitura do
--       personal nunca atualiza quando o aluno abre o chat.
--   R5: botão "Excluir" da NotificationsView do personal falha em silêncio
--       (sem policy DELETE de notifications).
--   R1: verificação da publicação supabase_realtime (messages + notifications).
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. NOTIFICATIONS - policy INSERT (self-insert)
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
-- 2. MESSAGES - policy UPDATE para o aluno (mark as read)
--    Complementa messages_trainer_update (já existente).
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
-- 3. NOTIFICATIONS - policy DELETE (self) - opcional
--    Sem ela, o botão "Excluir" da NotificationsView do personal falha em
--    silêncio. Aplicar apenas se a exclusão de notificações for desejada.
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
-- 4. REALTIME - verificação da publicação supabase_realtime
--    O app assina canais postgres_changes em messages (chat) e notifications
--    (páginas de notificação, Sprint 10.1). Execute o SELECT abaixo para
--    confirmar que ambas as tabelas estão publicadas. Se faltarem, descomente
--    e execute os ALTERs correspondentes.
-- ---------------------------------------------------------------------------
SELECT pubname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Se `messages` NÃO aparecer no SELECT acima (o chat realtime depende disso):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Se `notifications` NÃO aparecer no SELECT acima (necessário para o realtime
-- das páginas de notificação):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
