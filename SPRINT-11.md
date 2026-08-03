# Sprint 11 — Hardening + Fundação V2 (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-11-hardening` (repo lslp3/vsfit-personal).

Status: **CONCLUÍDA E VALIDADA NO PREVIEW — APROVADA** para integração futura.
**Congelada** — nenhuma alteração adicional será feita nesta Sprint; ajustes
futuros são tratados como HOTFIX, preservando esta entrega como fechada.

## Contexto

A Sprint 10.1 (módulo de comunicação) foi concluída, validada, aprovada e
congelada antes desta Sprint. A Sprint 11 não alterou funcionalidades
congeladas (chat realtime, notificações, execução de treino, evolução do aluno)
nem executou qualquer alteração de banco/RLS/Edge Functions — o foco foi
segurança e estabilidade.

## Escopo E1–E6 (registro)

| Etapa | Tema | Status |
| ----- | ---- | ------ |
| E1 | RLS operacional (notifications INSERT/student, messages UPDATE student, DELETE, realtime) | ✅ C2 — SQL manual entregue |
| E2 | Higienização (código morto, tipos Message) | ✅ C3 |
| E3 | Quality Gate TypeScript (any, strict incremental) | ⏸️ não implementado — registrado para sprint futura |
| E4 | Segurança e sessão (NotificationsView localStorage, debug exposto) | ✅ E4 |
| E5 | Nutrition (studentid/student_id, camelCase) | ⏸️ não implementado — registrado para sprint futura |
| E6 | Desktop responsivo (análise) | ⏸️ não implementado — registrado para sprint futura |

## Entregas

### C1 — Documentação (commit `e20f441`)
- `SPRINT-11.md` (criação) + `ROADMAP.md` (Sprint 11 em andamento).

### C2 — E1 RLS operacional (commit `6242794`)
- `supabase/sprint11_manual_policies.sql` (novo, 129 linhas) — aplicação MANUAL
  pelo usuário no Supabase (NÃO executado pelo agente):
  1. `notifications_self_insert` (user_id = auth.uid()) — trainerService,
     workoutExpirationService;
  2. `notifications_student_insert_for_trainer` — useWorkoutExecution
     (aluno → personal via students.auth_user_id = auth.uid());
  3. `messages_student_update` — aluno marca como lida a própria conversa;
  4. `notifications_self_delete` — botão Excluir do Personal;
  5. Queries de conferência (pg_policies + supabase_realtime) e ALTERs de
     publication apenas comentados.
- Idempotente com `sprint10_manual_policies.sql` (DROP POLICY IF EXISTS).

### C3 — E2 Higienização (commit `5d356a6`)
- Removidos 7 arquivos sem nenhuma referência (busca repo-wide + tsc):
  `src/routes.tsx`, `src/App.tsx` (vazios), `src/store/trainerStore.ts`,
  `src/store/workoutStore.ts`, `src/lib/auth.ts`,
  `src/components/workout-execution/DropSetPanel.tsx`,
  `src/services/nutritionService.ts`.
- Consolidação de tipos Message: nova interface `MessageInsert` em
  `src/types/database.ts`; `sendMessage` usa `MessageInsert` (removido o tipo
  inline). `Message` permanece como definição única da linha completa.

### E4 — Segurança e sessão (commit `5c85b0f`)
- `NotificationsView`: removidas leitura manual + JSON.parse de
  `supabase.auth.token`/`vsfit_session`/chaves locais e as gravações manuais
  de `vsfit_coach_email`/`vsfit_coach_user_id`; identidade agora via
  `supabase.auth.getUser()` e consultas protegidas por RLS.
- `ForgotPasswordPage`: removido bloco DEBUG "RESET REDIRECT" (vazava URL de
  reset) e a variável `redirectTo` externa ociosa; o redirectTo funcional foi
  preservado.

## Validação final

- [x] tsc --noEmit (0 erros) em todos os commits.
- [x] npm run build (0 erros) em todos os commits.
- [x] Preview funcional (checks Vercel success em todos os shas).
- [x] Zero leitura manual de tokens no código (auditoria final E4).
- [x] Branch sincronizada com o remoto (HEAD = origin).
- [x] Working tree limpo.

## Commits da Sprint

| Commit | Descrição |
| ------ | --------- |
| `e20f441` | docs(sprint11): start hardening sprint |
| `6242794` | feat(rls): add sprint11 manual communication policies |
| `5d356a6` | chore(cleanup): remove dead code and consolidate message types |
| `5c85b0f` | fix(security): E4 - remove manual token storage reads and reset debug block |
| (docs) | Documentação oficial de fechamento (este arquivo + ROADMAP.md) |

## Fechamento

✅ **Sprint 11 Concluída**
✅ **Validada no Preview**
✅ **Aprovada**
✅ **Congelada** (somente HOTFIX caso necessário)

E3, E5 e E6 não foram implementados nesta Sprint e ficam registrados como
candidatos a sprints futuras (Quality Gate TS, Nutrition, Desktop responsivo).
A próxima Sprint (12) será Push Notifications (Supabase + Firebase Cloud
Messaging) — ver ROADMAP.md.
