# Sprint 17 — Primeiro Acesso Inteligente, Onboarding e Fluxo de Entrada

Status: ✅ **Concluída** — fechada em 2026-08-06.
Branch de implementação: `test/sprint-16-central-alunos` (escopo Sprint 17 implementado
por reaproveitamento da base existente).

## Objetivo

Criar uma experiência de entrada profissional: cada usuário entende o produto,
escolhe seu papel (Personal ou Aluno) e entra no fluxo correto — sem repetir
onboarding, cadastro ou escolha de perfil em aberturas posteriores.

## Etapas

| Etapa | Escopo | Status |
|-------|--------|--------|
| 1 | Auditoria da inicialização atual | ✅ Concluída |
| 2 | Splash Screen Inteligente | ✅ Concluída |
| 3 | Sistema de Primeiro Acesso | ✅ Concluída |
| 4 | Onboarding Inicial | ✅ Concluída |
| 5/6 | Fluxo público de entrada (cadastro público → lead → conversão → aluno → login) | ✅ Validada |
| 7 | Usuário Existente (sem repetir onboarding) | ✅ Hardening concluído |
| 8 | Tratamento Offline (Fase A global + Fase B recuperação) | ✅ Concluída |
| 9 | Atualização sem repetir onboarding | ✅ Concluída |
| 10 | Testes completos de entrada | ✅ Homologada |
| 11 | Fechamento da Sprint | ✅ Este documento |

## Principais entregas

- Splash inteligente (conectividade + verificação de sessão, mínimo 1,5s).
- Primeiro acesso por perfil e onboarding persistente (`onboardingService` +
  `onboardingStore`, chave `vsf_first_access_v1`).
- Fluxo Personal: onboarding → login/cadastro → Dashboard (gate de setup inicial).
- Fluxo Aluno: entrada obrigatória por código/link do Personal (não cria conta
  independente). Aluno convertido/login entra direto — sem onboarding/convite.
- Cadastro público com lead (`/signup/:slug` + `signupService.submitSignupLead`).
- Conversão de lead para aluno (`convertLeadToStudent`) sem colunas inexistentes.
- Usuário existente vai direto para a área do seu role (Personal → Dashboard,
  Aluno → Meu treino, Admin → Dashboard), sem onboarding/login/escolha re-exibidos.
- Offline global (`OfflineScreen`) + recuperação automática ao reconectar.
- Deep-links de entrada preservados (`/signup/:slug`, `/auth/*`, reset de senha).

## Commits representativos

- `237bd5c` — safe-area Capacitor 8
- `3d1e09e` — remoção do RETURNING no insert de `signup_leads`
- `870adf4` — `status: 'pending'` no lead
- `1b5c27a` — remove `signup_lead_id` do insert de `students`
- `4f55cbd` — remove `source` do insert de `students`
- `c7f50ec` — gate de onboarding não intercepta deep-links de entrada (ETAPA 7)
- `2a84d9b` — tratamento offline global (ETAPA 8)
- `1612cb3` — persistência robusta de onboarding (ETAPA 9)

## Validação

- `npx tsc --noEmit` ✅
- `npm run build` ✅ (PWA, precache consolidado)
- Invariantes preservadas: `supabase.from(` = 8 · Central de Alunos intacta ·
  nenhuma migration criada · nenhuma alteração de RLS/permissões.

## Pendências pós-fechamento

- Validação manual na Preview da Vercel (branch `test/sprint-16-central-alunos`)
  e em APK real: onboarding, todas as rotas de cada papel, modo offline, deep-links.
- Integração à `main` somente após essa validação manual e aprovação explícita.