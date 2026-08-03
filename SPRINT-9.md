# Sprint 9 — Evolução do Aluno (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-9-evolucao-aluno` (repo lslp3/vsfit-personal).

Status: **CONCLUÍDA E VALIDADA NO PREVIEW** — aprovada para integração futura.
Nenhuma alteração adicional será feita nesta Sprint; ajustes futuros serão tratados
como HOTFIX, preservando esta entrega como fechada.

## Regras de escopo (vigentes em toda a Sprint)

- Opção A aprovada: medidas corporais em `student_metrics`; gráfico de linha SVG
  próprio (sem lib externa); reuso do bucket `progress-photos`; sem tabelas novas.
- Proibido alterar: execução de treino, técnicas premium (Drop-set/Rest-pause/
  Pirâmide/Bi-set), WorkoutBuilder, techniqueEngine, autenticação, RLS, publicação.
- Banco congelado: migration de circunferências entregue para aplicação MANUAL no
  Supabase (aplicada pelo responsável antes da validação final).
- Etapas com auditoria: `tsc --noEmit` + `npm run build` antes de cada commit;
  commit separado por etapa; sem merge na main.

## Etapas

### Fundação E1 + E2 — Camada de dados, strength tracker e gráfico (CONCLUÍDA)
Commit: `18e02c7` — feat(evolution): assessment db layer, strength tracker, SVG line chart
- `supabase/migrations/20260802000000_add_student_metrics_circumferences.sql`
  (ALTER manual: arm_cm, chest_cm, waist_cm, abdomen_cm, hips_cm, thigh_cm,
  calf_cm — aplicado manualmente no Supabase).
- `src/types/database.ts` — `StudentMetrics` com as 7 circunferências.
- `src/utils/evolution.ts` — `EvolutionPoint`, `axisRange`, `metricPointsToEvolution`.
- `src/services/strengthService.ts` — `StrengthTracker` (`byEvolution` +
  `bestExerciseByVolume()`).
- `src/components/progress/LineChart.tsx` — gráfico SVG custom dark, sem lib.

### E3 — Página do aluno (CONCLUÍDA)
Commit: `b87e129` — feat(student): evolution charts, measurements and strength history
- `src/pages/student/StudentProgressPage.tsx` — gráfico de peso e gordura,
  medidas corporais, histórico de força, seção Antes/Depois com fotos
  (Frente/Lado/Costas via `progress-photos`).

### E4 — Página do Personal: avaliações/medidas/metas writable (CONCLUÍDA)
Commit: `0ba5070` — feat(personal): writable assessments, body measurements and student goals
- `src/components/personal/AssessmentModal.tsx` (novo) — criar/editar/excluir
  avaliação física com as 7 medidas corporais.
- `src/components/personal/GoalsModal.tsx` (novo) — salvar/editar metas do aluno.
- `src/services/progressService.ts` — `saveStudentMetric`, `deleteStudentMetric`,
  `saveStudentGoals`, `StudentMetricRecord` com circunferências.
- `src/pages/personal/StudentProfilePage.tsx` — botão NOVA abre o modal; cards com
  Editar/Excluir + 7 medidas; seção Metas editável; correção de formatação.

### Patch de diagnóstico (CONCLUÍDO — permanece até decisão de revert)
Commit: `9b2358b` — diagnose(personal): reveal real supabase error on assessment save
- `progressService.ts` — logs estruturados do erro real (error, JSON.stringify,
  data, status, statusText).
- `AssessmentModal.tsx` — exibe code + mensagem reais do Supabase no catch.
- Objetivo: revelar o erro verdadeiro do "Erro ao salvar avaliação" (migration não
  aplicada à época). Após a aplicação manual da migration, a Sprint foi validada
  integralmente. Reverter apenas se decidido em conjunto.

## Validação final (Preview)

- [x] Criar avaliação física.
- [x] Editar avaliação física.
- [x] Excluir avaliação física.
- [x] Salvar e editar metas do aluno.
- [x] Gráfico de evolução do peso funcionando.
- [x] Gráfico de gordura corporal funcionando.
- [x] Medidas corporais funcionando.
- [x] Histórico de força funcionando.
- [x] Upload das fotos de evolução funcionando.
- [x] Fotos de Frente, Lado e Costas aparecendo corretamente para o aluno.
- [x] Persistência dos dados validada.
- [x] Nenhuma regressão na execução dos treinos.
- [x] Build e TypeScript aprovados.

## Commits da Sprint

| Commit | Descrição |
| ------ | --------- |
| `18e02c7` | Fundação E1+E2 (camada de dados, strength tracker, SVG chart) |
| `b87e129` | E3 — página do aluno (gráficos, medidas, histórico, Antes/Depois) |
| `0ba5070` | E4 — página do Personal (avaliações/medidas/metas writable) |
| `9b2358b` | Patch de diagnóstico do erro de salvamento de avaliação |

Observação: a documentação desta Sprint foi concluída no commit final (este arquivo
+ ROADMAP.md). Nenhuma alteração funcional adicional será feita na Sprint 9.
