# VSFit Personal — CHECKLIST de Sprints

Documento interno de acompanhamento do status de cada sprint do VSFit PERSONAL.
Complementa o ROADMAP.md. Atualizado a cada fechamento/fechada de sprint.

Legenda: ✅ concluída · 🔄 em andamento · 📋 planejada · ⏸️ postergada

---

## Sprint 13 — Chat Media 🟢🔄 (ATUAL)

- Status: 🟢 **ETAPA 1 (Infraestrutura) concluída** · 🟢 **ETAPA 2 (Upload)
  concluída** — 🔄 **ETAPA 3 (Preview) pendente**
- Branch: `teste` (trabalho ETAPA 1/2 não-commitado / a definir)
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
- Deliverables pendentes — **ETAPA 3 → Preview e visualização de mídia**:
  - [ ] Renderização de imagens
  - [ ] Player de vídeo
  - [ ] Player de áudio
  - [ ] Visualização/download de documentos
  - [ ] Signed URLs
  - [ ] Cache de mídia
  - [ ] Melhoria do componente de mensagem

---

## Sprints concluídas

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

- Sprint 13 → **Chat Media** (🟢 ETAPA 1+2 concluídas; 🔄 ETAPA 3 pendente)
- Sprint 14 → **Financeiro do Personal**
- Sprint 15 → **Advanced Analytics & Dashboard**
- Sprint 16 → **Desktop Version**
- **AI para Personal** → ⏸️ Postergada para versão futura, **após o Sprint 16**.

---

## Política

1. Cada sprint é validada (Preview e/ou dispositivo real) antes de marcada como
   concluída.
2. Concluída → congelada; ajustes viram HOTFIX em branch própria.
3. Integração à `main` só com aprovação explícita.
4. Doc detalhada em `SPRINT-<n>.md`; status consolidado aqui.