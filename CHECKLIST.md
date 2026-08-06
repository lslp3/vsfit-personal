# VSFit Personal — CHECKLIST de Sprints

Documento interno de acompanhamento do status de cada sprint do VSFit PERSONAL.
Complementa o ROADMAP.md. Atualizado a cada fechamento/fechada de sprint.

Legenda: ✅ concluída · 🔄 em andamento · 📋 planejada · ⏸️ postergada

---

## Sprint 13 — Chat Media 🟢🔄 (ATUAL)

- Status: 🟢 **ETAPA 1 (Infraestrutura) concluída** · 🟢 **ETAPA 2 (Upload)
  concluída** · 🟢 **ETAPA 3 (Preview) concluída e validada tecnicamente**
- Branch: `sprint-13-chat-media` (commit `5a5c913` — ETAPAS 1/2 + docs)
- Escopo: mídia no chat (imagens, vídeos, áudios, documentos) via Supabase
  Storage (`chat-files`); upload/download/preview/cache; storage policies + RLS;
  novas colunas em `messages`.
- Entregas concluídas (ETAPA 1 + 2):
  - [x] Bucket privado `chat-files` configurado
  - [x] Policies Storage aplicadas
  - [x] Campos de mídia adicionados na tabela `messages`
  - [x] Upload de imagens, vídeos, áudios e documentos implementado
  - [x] Validação de MIME e tamanho
  - [x] Geração de path seguro:
    `chat-files/{trainer_id}/{student_id}/{message_id}/{arquivo}`
  - [x] Rollback de upload em caso de falha
  - [x] Integração com Personal Chat e Student Chat
  - [x] Build e TypeScript validados
- Entregas concluídas (ETAPA 3 — Preview):
  - [x] `MessageBubble` reutilizável criado
  - [x] Removida duplicação entre Personal Chat e Student Chat
  - [x] Preview de imagens implementado
  - [x] Preview de vídeos implementado
  - [x] Preview de áudios implementado
  - [x] Preview de documentos implementado
  - [x] Signed URLs utilizadas para arquivos privados
  - [x] Cache de URLs implementado
  - [x] Estados de loading e erro adicionados
  - [x] Fundo neutro escuro aplicado nas mídias (decisão UX)
  - [x] Testes: TypeScript sem erros · Build PWA concluído
- Pendências — validação manual (próxima etapa):
  - [ ] Teste manual em dispositivo real: Personal enviando mídia; Aluno
    enviando mídia; todos os tipos de arquivo
  - [ ] Validar comportamento de download de documentos no APK/WebView

---

## Sprints concluídas

### Sprint 18 — Versão Desktop ✅
- Status: ✅ Concluída · fechada em 2026-08-06
- Branch: `test/sprint-18-desktop-version`
- Principais entregas: Shell Desktop Personal/Aluno (sidebar fixa `md+`, bottom-nav só
  mobile); containers ampliados (`md:max-w-7xl`); telas especiais desktop (Chat,
  WorkoutExecution, Auth/Onboarding); PWA/Desktop polish (acessibilidade teclado,
  overflow, cursor, manifest sem portrait). Mobile 100% preservado.
- Validação: `tsc` ✅ · `npm run build` ✅ · validação manual (Preview/APK) ✅ concluída
- Doc: `SPRINT-18.md`

### Sprint 17 — Primeiro Acesso Inteligente, Onboarding e Fluxo de Entrada ✅
- Status: ✅ Concluída · fechada em 2026-08-06
- Branch: `test/sprint-16-central-alunos` (implementação por reaproveitamento de base)
- Principais entregas: Splash inteligente; primeiro acesso por perfil; onboarding
  persistente; fluxo Personal; fluxo Aluno (convite/código); cadastro público com
  lead; conversão de lead para aluno; login do aluno; usuário existente sem repetir
  onboarding; offline global com recuperação após reconexão; testes completos de
  entrada.
- Validação: `tsc` ✅ · `npm run build` ✅ · validação manual (Preview/APK) pendente
- Doc: `SPRINT-17.md`

### Sprint 12 — Push Notifications ✅
- Status: ✅ Concluída · ✅ Validada em dispositivo real (Android) · ✅ Pronta p/ produção
- Branch: `test/sprint-12-push`
- Principais entregas: FCM configurado; Edge Function `send-push-notification`
  operando; GitHub Actions gerando APK (secret `GOOGLE_SERVICES_JSON` corrigido
  p/ Base64); registro automático do token FCM; armazenamento em `push_tokens`;
  envio e recebimento ok; validação ponta a ponta em Android.
- Doc: `SPRINT-12.md`

### Sprint 11 — Hardening + Fundação V2 ✅
- Status: ✅ Concluída · ✅ Validada em Preview · ✅ Aprovada para integração
- Branch: `test/sprint-11-hardening`

### Sprint 10 — Módulo de Comunicação ✅
- Status: ✅ Concluída · ✅ Validada em Preview · ✅ Aprovada para integração
- Branch: `test/sprint-10-comunicacao`

### Sprint 9 — Evolução do Aluno ✅
- Status: ✅ Concluída · ✅ Validada em Preview · ✅ Aprovada para integração
- Branch: `test/sprint-9-evolucao-aluno`

### Sprint 8.1 — Blindagem do Rascunho do Workout Builder ✅
- Status: ✅ Concluída

### Sprint 7B — Refatoração Premium da Execução de Treino ✅
- Status: ✅ Concluída

---

## Sequência oficial futura

- Sprint 13 → **Chat Media** (🟢 ETAPA 1+2+3 concluídas tecnicamente; ⬜ validação manual pendente)
- Sprint 14 → **Financeiro do Personal**
- Sprint 15 → **Advanced Analytics & Dashboard**
- **AI para Personal** → ⏸️ Postergada para versão futura, **após o Sprint 18**.

---

## Política

1. Cada sprint é validada (Preview e/ou dispositivo real) antes de marcada como
   concluída.
2. Concluída → congelada; ajustes viram HOTFIX em branch própria.
3. Integração à `main` só com aprovação explícita.
4. Doc detalhada em `SPRINT-<n>.md`; status consolidado aqui.