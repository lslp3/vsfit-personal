# VSFit — Roadmap Geral do Projeto

Roadmap oficial de sprints do VSFit PERSONAL. Branches de trabalho: `test/*`
(Preview via Vercel). Nenhuma sprint é mergeada na `main` sem ordem explícita.

## Legenda

- ✅ Concluída e validada no Preview
- 🔄 Em andamento
- ⏸️ Bloqueada / aguardando
- 📋 Planejada

---

## Sprint 7B — Refatoração Premium da Execução de Treino

- Status: ✅ Concluída (branch `test/sprint-7b-execucao-premium`)
- Commit final: `5062f3d`
- Validação: aprovada; guarda de memória registrada (Sprint 8.1 blindou o rascunho
  do WorkoutBuilder; commit `5062f3d`).

## Sprint 8.1 — Blindagem do Rascunho do Workout Builder

- Status: ✅ Concluída
- Commit: `5062f3d`
- Validação: aprovada; sistema de rascunho resiliente (camada
  `workoutDraftService` + chaves v1 preservadas).

## Sprint 9 — Evolução do Aluno

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- Branch: `test/sprint-9-evolucao-aluno`
- Commits: `18e02c7`, `b87e129`, `0ba5070`, `9b2358b`, + documentação final
- Escopo: circunferências em `student_metrics`, gráfico SVG próprio, reuso do
  bucket `progress-photos`, avaliações/medidas/metas writable (Personal),
  página de evolução do aluno.
- **Não realizar mais alterações nesta Sprint.**
- Ajustes futuros relacionados à Sprint 9 serão tratados como **HOTFIX**,
  preservando esta entrega como fechada.

## Sprint 10 — Módulo de Comunicação (chat, notificações, presence)

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- **Congelada** — não realizar alterações, exceto HOTFIX.
- Branch: `test/sprint-10-comunicacao`
- Commits: `75be443`, `0ac9099`, `77afcf9`, + documentação final
- Escopo: consolidação do módulo de comunicação (chat, notificações e presence);
  higienização de páginas órfãs; `messageService` alinhado ao schema real;
  rota `/student/notifications`; lista de conversas do Personal mostrando todos
  os alunos vinculados; realtime e presence estáveis.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — preservando esta
  entrega como fechada.

## Sprint 11 — Hardening + Fundação V2

- Status: ✅ **Concluída**
- Validação: **Validada em Preview**
- **Aprovada para integração futura**
- **Congelada** — somente HOTFIX caso necessário.
- Branch: `test/sprint-11-hardening`
- Commits: `e20f441`, `6242794`, `5d356a6`, `5c85b0f`, + documentação final
- Origem: `test/sprint-10-comunicacao` (5d1ad50)
- Escopo entregue: C1 docs, C2 SQL manual de RLS (notifications/messages),
  C3 remoção de código morto + consolidação de tipos Message, E4 segurança de
  sessão (getUser() sem tokens manuais no localStorage).
- E3 (quality gate TS), E5 (nutrition) e E6 (desktop responsivo) não
  implementados nesta Sprint — registrados como candidatos a sprints futuras.

## Sprint 12 — Push Notifications (AGUARDANDO VALIDAÇÃO FINAL)

- Status: 🔄 **Em andamento** — implementação concluída, pronta para testes reais.
- Branch: `test/sprint-12-push`
- Origem: `test/sprint-11-hardening` (7309a03)
- Escopo entregue (ETAPAS 1–8): push Android via Supabase + FCM + Capacitor —
  registro/refresh/remoção de token, Edge Function de envio (service_role),
  eventos de negócio (mensagem, treino, pagamento, plano, sistema),
  foreground/background/terminated, deep link + banner, preferências de push.
- **Aguardando teste real em dispositivo** (Firebase + google-services.json +
  Service Account + deploy da Edge Function + aplicar SQL manual + APK).
- Sprint NÃO encerrada até validação completa.

---

## Política de fechamento

1. Cada sprint é validada no Preview antes de ser marcada como concluída.
2. Depois de concluída, nenhuma alteração é feita naquela entrega — ajustes viram
   HOTFIX em branch própria.
3. Integração à `main` só após aprovação explícita.
4. Documentação de sprint detalhada em `SPRINT-<n>.md`.
