-- ==============================================================================
-- SPRINT 12 — ETAPA 3: PERSISTÊNCIA DOS TOKENS PUSH (FCM)
-- Aplicação MANUAL no Supabase (SQL Editor) pelo usuário.
-- NÃO executado pelo agente. Nenhuma migration automática.
--
-- Cria:
--   push_tokens        — tokens FCM por usuário (multi-dispositivo)
--   push_preferences   — preferências de push por usuário (estrutura pronta;
--                        interface visual fica para sprint futura)
--   policies RLS       — usuário gerencia SOMENTE os próprios registros
--   índices + trigger updated_at
--
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
-- DROP POLICY IF EXISTS + CREATE POLICY / CREATE OR REPLACE FUNCTION /
-- DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1) TABELA push_tokens
--    user_id = auth uid do DONO do dispositivo (referencia auth.users).
--    UNIQUE(user_id, device_token): garante idempotência do upsert e evita
--    registros duplicados do mesmo dispositivo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token text NOT NULL,
  platform text NOT NULL DEFAULT 'android'
    CHECK (platform IN ('android', 'ios', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_token)
);

COMMENT ON TABLE public.push_tokens IS
  'Sprint 12 — tokens FCM registrados por dispositivo. A Edge Function de envio '
  'lê esta tabela com service_role (bypassa RLS); o cliente só gerencia os '
  'próprios tokens.';

-- Índices: consulta de envio por usuário + unicidade (já coberta pelo UNIQUE).
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);
CREATE INDEX IF NOT EXISTS push_tokens_device_token_idx ON public.push_tokens (device_token);

-- ---------------------------------------------------------------------------
-- 2) TABELA push_preferences
--    Uma linha por usuário (user_id PK). Defaults: tudo ligado. Interface
--    visual NÃO implementada nesta sprint — apenas estrutura de dados.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages boolean NOT NULL DEFAULT true,
  workouts boolean NOT NULL DEFAULT true,
  payments boolean NOT NULL DEFAULT true,
  system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.push_preferences IS
  'Sprint 12 — preferências de push por usuário (NEW_MESSAGE, WORKOUT, '
  'PAYMENT, SYSTEM). Estrutura preparada; UI de configuração em sprint futura.';

-- ---------------------------------------------------------------------------
-- 3) RLS — push_tokens (usuário gerencia somente os próprios tokens)
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê apenas os próprios tokens.
DROP POLICY IF EXISTS push_tokens_self_select ON public.push_tokens;
CREATE POLICY push_tokens_self_select ON public.push_tokens
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: usuário só insere token com user_id = próprio auth.uid().
DROP POLICY IF EXISTS push_tokens_self_insert ON public.push_tokens;
CREATE POLICY push_tokens_self_insert ON public.push_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: usuário só atualiza os próprios tokens.
DROP POLICY IF EXISTS push_tokens_self_update ON public.push_tokens;
CREATE POLICY push_tokens_self_update ON public.push_tokens
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: usuário só remove os próprios tokens (usado no logout).
DROP POLICY IF EXISTS push_tokens_self_delete ON public.push_tokens;
CREATE POLICY push_tokens_self_delete ON public.push_tokens
  FOR DELETE USING (user_id = auth.uid());

-- NOTA: a leitura para ENVIO é feita pela Edge Function com service_role
-- (bypassa RLS) — nenhuma policy extra necessária para o remetente.

-- ---------------------------------------------------------------------------
-- 4) RLS — push_preferences (usuário gerencia somente as próprias)
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_preferences_self_select ON public.push_preferences;
CREATE POLICY push_preferences_self_select ON public.push_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_preferences_self_insert ON public.push_preferences;
CREATE POLICY push_preferences_self_insert ON public.push_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_preferences_self_update ON public.push_preferences;
CREATE POLICY push_preferences_self_update ON public.push_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_preferences_self_delete ON public.push_preferences;
CREATE POLICY push_preferences_self_delete ON public.push_preferences
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) TRIGGER updated_at (compartilhado)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_tokens_set_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_set_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS push_preferences_set_updated_at ON public.push_preferences;
CREATE TRIGGER push_preferences_set_updated_at
  BEFORE UPDATE ON public.push_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) CONFERÊNCIA (após aplicar)
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('push_tokens', 'push_preferences')
ORDER BY tablename, policyname;
