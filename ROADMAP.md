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

## Sprint 14 — Financeiro do Personal (PLANEJADA)

- Status: 📋 **Planejada**
- Objetivo: auditar e evoluir toda a parte financeira do Personal Trainer.
- Abranger: auditoria das tabelas financeiras existentes; fluxo atual de
  cobrança; integração Mercado Pago; pagamentos PIX dos alunos; status de
  pagamento; histórico financeiro; dashboard financeiro; melhorias necessárias
  para produção.

## Sprint 15 — Advanced Analytics & Dashboard (PLANEJADA)

- Status: 📋 **Planejada**
- Escopo: analytics avançado e dashboard para o Personal.

## Sprint 16 — Desktop Version (PLANEJADA)

- Status: 📋 **Planejada**
- Escopo: versão desktop (responsividade ampliada / app desktop).

## AI para Personal (POSTERGADA)

- Status: ⏸️ **Postergada para versão futura, após o Sprint 16.**

---

## Política de fechamento

1. Cada sprint é validada no Preview antes de ser marcada como concluída.
2. Depois de concluída, nenhuma alteração é feita naquela entrega — ajustes viram
   HOTFIX em branch própria.
3. Integração à `main` só após aprovação explícita.
4. Documentação de sprint detalhada em `SPRINT-<n>.md`.
