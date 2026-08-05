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

## Sprint 12 — Push Notifications

- Status: ✅ **Concluída**
- Validação: **Validada em dispositivo real (Android)**
- **Pronta para Produção**
- Branch: `test/sprint-12-push`
- Origem: `test/sprint-11-hardening` (7309a03)
- Escopo entregue (ETAPAS 1–8): Firebase Cloud Messaging configurado, Edge
  Function `send-push-notification` funcionando, GitHub Actions gerando APK
  corretamente (Secret `GOOGLE_SERVICES_JSON` corrigido — Base64), registro
  automático do token FCM, armazenamento correto em `push_tokens`, envio e
  recebimento funcionando, validação completa em dispositivo Android.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — entrega fechada.

---

## Sprint 13 — Chat Media 🟢🔄 (EM ANDAMENTO)

- Status: 🟢 **ETAPA 1 (Infraestrutura) concluída** · 🟢 **ETAPA 2 (Upload)
  concluída** · 🟢 **ETAPA 3 (Preview) concluída e validada tecnicamente**
- Branch: `sprint-13-chat-media` (commit `5a5c913` — ETAPAS 1/2 + docs)
- Escopo: mídia no chat — imagens, vídeos, áudios, documentos (PDF, DOC, etc.),
  via Supabase Storage (bucket `chat-files`), upload/download/preview/cache,
  políticas de storage, RLS e novas colunas em `messages`.
- Requer: migration de colunas de mídia + criação/confirmação do bucket
  `chat-files` + políticas de storage (aplicação manual no Supabase).
- Entregas registradas (ETAPA 1 + 2):
  - Bucket privado `chat-files` configurado.
  - Policies Storage aplicadas.
  - Campos de mídia adicionados na tabela `messages`.
  - Upload de imagens, vídeos, áudios e documentos implementado.
  - Validação de MIME e tamanho.
  - Geração de path seguro:
    `chat-files/{trainer_id}/{student_id}/{message_id}/{arquivo}`
  - Rollback de upload em caso de falha.
  - Integração com Personal Chat e Student Chat.
  - Build e TypeScript validados.
- Entregas registradas (ETAPA 3 — Preview):
  - `MessageBubble` reutilizável criado (unifica Personal Chat e Student Chat).
  - Removida duplicação entre Personal Chat e Student Chat.
  - Preview de imagens implementado (thumbnail, loading, erro, zoom).
  - Preview de vídeos implementado (player HTML5).
  - Preview de áudios implementado (player compacto).
  - Preview de documentos implementado (card + abrir/baixar).
  - Signed URLs utilizadas para arquivos privados (sem URL pública).
  - Cache de URLs implementado (por mensagem).
  - Estados de loading e erro adicionados.
  - Fundo neutro escuro aplicado nas mídias conforme decisão UX.
  - Testes: ✅ TypeScript sem erros · ✅ Build PWA concluído.
- Pendências — validação manual (próxima etapa):
  - ⬜ Teste manual em dispositivo real: Personal enviando mídia; Aluno enviando
    mídia; todos os tipos de arquivo.
  - ⬜ Validar comportamento de download de documentos no APK/WebView.

## Sprint 14 — Analytics Dashboard do Personal

- Status: ✅ **Concluída e homologada no Preview**
- **Aprovada para integração futura**
- **Congelada** — não realizar alterações, exceto HOTFIX.
- Branch: `sprint-14-analytics-dashboard`
- Origem: `sprint-13-chat-media`
- Commits: `971ab97`, `2bc3ed0`, `f74717d`, `2b8cf68`, `d69a8ee`, `17a8f1b`,
  `2b00741`, `53dee0f`, + encerramento (ETAPA FINAL)
- Escopo: camada centralizada de analytics (`analyticsService` +
  `useTrainerAnalytics` + `types/analytics.ts`); componentes de dashboard
  (`MetricCard`, `RevenueChart`, `WorkoutTrendChart`, `StudentStatusChart`,
  `AdherenceChart`, `VolumeProgressChart`, `RiskStudentsCard`, `InsightsCard`);
  `AnalyticsPage` com filtros de período (Hoje/7d/30d/90d/Ano/Personalizado),
  tendências atual × anterior (▲/▼/estável com %), KPIs com indicadores
  visuais e seção de Insights derivados de dados reais; rota
  `/personal/analytics` + item Analytics no menu lateral do Personal.
- Infraestrutura temporária de preview (`src/dev`, rota
  `/dev/analytics-preview`, atalho `/?preview=analytics`) removida na ETAPA
  FINAL — nenhuma referência restante.
- Garantias: sem migrations, sem alteração de RLS, sem mudanças em Chat Media,
  Progress, Reports ou Financial.
- **Não realizar alterações nesta Sprint, exceto HOTFIX** — preservando esta
  entrega como fechada. Detalhes em `SPRINT-14.md`.

## Sprint 15 — Financeiro do Personal 🟢🔄 (EM ANDAMENTO — FASE 2)

- Status: 🟢🔄 **Fase 1 concluída e homologada** (2026-08-05, "sem
  regressões"). **Fase 2 em andamento.**
- Branch: `test/sprint-15-financeiro`
- Origem: `sprint-14-analytics-dashboard` (Sprint 14 finalizada)
- **Fase 1 — Refatoração e Padronização (concluída e homologada):**
  - Camada reutilizável criada em `src/lib/adminFinance.ts`: `fetchAllRows`
    (paginação parametrizada), `normalizePlan`/`normalizeStatus`,
    `isApprovedStatus`/`isPendingStatus`/`isFailedStatus`/`isRefundedStatus`/
    `isActiveSubscriptionStatus`, `getPaymentDate`/`getPaymentEnvironment`/
    `getTimestamp`/`getMonthKey`/`getValidDate`/`isCurrentMonth`/`isSameMonth`,
    `MONTH_LABELS`, `getPlanLabel`/`getPlanClass`, tipos `AdminPlanSlug` e
    `AdminFinancialEnvironment`.
  - Duplicação eliminada nos **4 serviços administrativos** (`adminFinancialService`,
    `adminSubscriptionService`, `adminDashboardService`, `adminReportsService`)
    — helpers locais removidos em favor da camada, sem alteração de regras de
    negócio, UX, telas, layout, gráficos, APIs, banco, RLS, Mercado Pago ou PIX.
  - Código morto removido da camada e dos serviços (helpers sem consumidores).
  - `npx tsc --noEmit` ✅ exit 0 · `npm run build` ✅ exit 0.
  - Commit único da Fase: `9bf91d0`.
- **Fase 2 — Unificação e estabilização do resumo financeiro (em andamento):**
  - Unificar definitivamente o `AdminFinancialSummary` com **uma única regra de
    negócio** (produção + pagamentos aprovados) compartilhada entre Admin
    Financial e Admin Subscriptions, eliminando a divergência de cálculo entre
    as telas.
  - Centralizar helpers duplicados restantes do módulo financeiro admin.
  - Remover apenas código morto do módulo financeiro admin identificado na
    auditoria.
  - Sem alterações de layout, UX, design, funcionalidades novas, fluxo do
    Personal, PIX, Mercado Pago, Edge Functions, banco/migrations/RLS ou regras
    de negócio já homologadas.
- Nota: no plano anterior constava como "Sprint 14 — Financeiro do Personal";
  renumerada após o Analytics ser antecipado e executado como Sprint 14.

## Sprint 16 — Central de Alunos Premium (PLANEJADA)

- Status: 📋 **Planejada**
- Escopo mínimo previsto:
  - Dashboard/resumo dos alunos.
  - Cards Premium com indicadores rápidos.
  - Ações rápidas no card.
  - Filtros inteligentes.
  - Busca avançada.
  - Ordenação.
  - Seleção múltipla.
  - Indicadores visuais.
  - Melhorias de performance para listas grandes.
  - Skeletons, animações e UX Premium.

## Sprint 17 — Desktop Version (PLANEJADA)

- Status: 📋 **Planejada**
- Escopo: versão desktop (Responsividade ampliada / app desktop).

## AI para Personal (POSTERGADA)

- Status: ⏸️ **Postergada para versão futura, após o Sprint 17.**

---

## Política de fechamento

1. Cada sprint é validada no Preview antes de ser marcada como concluída.
2. Depois de concluída, nenhuma alteração é feita naquela entrega — ajustes viram
   HOTFIX em branch própria.
3. Integração à `main` só após aprovação explícita.
4. Documentação de sprint detalhada em `SPRINT-<n>.md`.
