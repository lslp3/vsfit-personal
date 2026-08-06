# Sprint 18 — Versão Desktop

Status: ✅ **Concluída** — fechada em 2026-08-06.
Branch de implementação: `test/sprint-18-desktop-version`.

## Objetivo

Entregar uma versão desktop profissional do VSFit Personal, aproveitando a base
mobile-first sem alterar páginas de conteúdo, regras de negócio, autenticação,
onboarding ou banco. O foco foi apresentação/layout (responsividade ampliada):

Mobile continua 100% como antes; desktop ganha sidebar fixa, containers ampliados
e experiência de tela larga.

## Fases

| Fase | Escopo | Status |
|------|--------|--------|
| A | Shell Desktop — sidebar fixa em `md+` (Personal e Aluno), bottom-nav só mobile | ✅ Concluída |
| B | Container Desktop — largura das áreas (`md:max-w-7xl` + paddings responsivo) | ✅ Concluída |
| C | Telas Especiais Desktop — Chat, WorkoutExecution, Auth/Onboarding | ✅ Concluída |
| D | PWA/Desktop Polish — acessibilidade teclado, overflow, cursor, manifest | ✅ Concluída |
| E | Homologação e fechamento (este documento) | ✅ Este documento |

## Principais entregas

- **Fase A** — `Sidebar.tsx` ganhou modo `inline` (desktop); `PersonalShell` e
  `StudentShell` com sidebar persistente em `md+`, `BottomNav` apenas mobile
  (padrão do `AdminShell`), identidade visual dark VSFit preservada.
- **Fase B** — containers globais ampliados: `max-w-lg` → `md:max-w-7xl` nos
  shells (header + main) e `.page-container` global. Mobile idêntico.
- **Fase C** — chat Personal/Student usa `md:max-w-3xl` (leitura); WorkoutExecution
  mantém overlay full-screen com conteúdo/CTA centrados em `md` (touch preservado);
  Auth cards `md:max-w-md`; onboarding de leitura `md:max-w-md`.
- **Fase D** — `:focus-visible` acessível (exclui inputs que têm `focus:ring`),
  `overflow-x: clip`, `min-width: 320px`, `button{cursor:pointer}`, manifest sem
  `orientation: portrait` (rotação livre em PWA/desktop/tablet).

## Commits representativos

- `7d09fbe` — Fase A: desktop shell layout for personal and student
- `d356a8e` — Fase B: widen desktop content containers
- `fcd63a4` — Fase C: widen chat, workout execution and auth screens for desktop
- `69400a0` — Fase D: polish pwa and desktop accessibility

## Validação

- `npx tsc --noEmit` ✅
- `npm run build` ✅ (PWA, precache 107)
- Invariantes preservadas: `supabase.from(` = 8 · Central de Alunos intacta ·
  nenhuma migration criada · nenhuma alteração de RLS/policies/permissões.
- Validação manual (mobile / tablet / desktop / PWA / foco teclado) ✅ concluída.

## Pendências/Riscos residuais

- Páginas com coluna interna própria (`max-w-lg` hardcoded em alguns casos) seguem
  estreitas em desktop por design — fora do escopo desta entrega.
- Integração à `main` somente após aprovação explícita (PR / merge manual).