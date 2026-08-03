# Sprint 11 — Hardening + Fundação V2 (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-11-hardening` (repo lslp3/vsfit-personal).

Status: **EM ANDAMENTO** — iniciada após o fechamento oficial da Sprint 10.1.
Execução em etapas controladas (C1–C7), cada uma com commit separado e
validação `tsc --noEmit` + `npm run build` antes do commit.

## Contexto

A Sprint 10.1 (módulo de comunicação) está **concluída, validada no Preview,
aprovada e congelada**. A Sprint 11 não altera funcionalidades congeladas —
qualquer ajuste em chat realtime, notificações, execução de treino ou evolução
do aluno é tratado como HOTFIX separado.

Foco da Sprint 11: **segurança e estabilidade antes de novas funcionalidades**.

## Escopo E1–E6

| Etapa | Tema | Status |
| ----- | ---- | ------ |
| E1 | RLS operacional (notifications INSERT/student, messages UPDATE student, DELETE, realtime) | 📋 C2 |
| E2 | Higienização (código morto, services/tipos duplicados) | 📋 C3 |
| E3 | Quality Gate TypeScript (any, strict incremental) | ⏸️ após C1-C3 |
| E4 | Segurança e sessão (NotificationsView localStorage, debug exposto) | ⏸️ após C1-C3 |
| E5 | Nutrition (studentid/student_id, camelCase) | ⏸️ após C1-C3 |
| E6 | Desktop responsivo (somente análise) | ⏸️ após C1-C3 |

## Regras

- Não mexer na `main`.
- Cada etapa com commit separado na `test/sprint-11-hardening`.
- Antes de cada commit: `npx tsc --noEmit` + `npm run build` (0 erros).
- Não aplicar SQL no Supabase automaticamente — SQL entregue em arquivo para
  aplicação MANUAL pelo usuário.
- Não alterar funcionalidades congeladas da Sprint 10.1.
- Nenhuma alteração de banco/RLS executada pelo agente.

## Commits

| Commit | Descrição |
| ------ | --------- |
| (C1) | docs(sprint11): start hardening sprint — este arquivo + ROADMAP |
| (C2) | feat(rls): add sprint11 manual communication policies |
| (C3) | chore(cleanup): remove dead code and consolidate message types |
| (E4+) | pendente — commits separados após validação do C1–C3 |

## Fechamento

A Sprint 11 será fechada após validação no Preview, seguindo a política de
fechamento do ROADMAP (nada de alterações após conclusão; ajustes viram HOTFIX).