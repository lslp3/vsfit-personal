-- ============================================================
-- SPRINT 9 — EVOLUÇÃO DO ALUNO
-- Opção A: adicionar medidas corporais (circunferência) ao
-- modelo de avaliação existente (student_metrics).
--
-- IMPORTANTE (protocolo de banco congelado):
-- Este arquivo A DEFINE as colunas novas. VOCÊ (Laercio) deve
-- aplicar manualmente no Supabase SQL Editor. O agente NÃO
-- executa DDL/RLS.
--
-- Aplicação: rodar este bloco UMA única vez. É idempotente
-- (IF NOT EXISTS), então é seguro reexecutar.
--
-- As colunas são NULLABLE e genéricas — a app lê/escreve de
-- forma defensiva, então o código não quebra se elas ainda
-- não existirem.
-- ============================================================

ALTER TABLE public.student_metrics
  ADD COLUMN IF NOT EXISTS arm_cm       numeric,
  ADD COLUMN IF NOT EXISTS chest_cm     numeric,
  ADD COLUMN IF NOT EXISTS waist_cm     numeric,
  ADD COLUMN IF NOT EXISTS abdomen_cm   numeric,
  ADD COLUMN IF NOT EXISTS hips_cm      numeric,
  ADD COLUMN IF NOT EXISTS thigh_cm     numeric,
  ADD COLUMN IF NOT EXISTS calf_cm      numeric;