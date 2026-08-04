# Sprint 13 — Chat Media (VSFit PERSONAL)

Documento de auditoria técnica + plano de implementação. Branch: `sprint-13-chat-media`
(repo lslp3/vsfit-personal).

Status: 🟢 **ETAPA 1 (Infraestrutura) CONCLUÍDA** · 🟢 **ETAPA 2 (Upload)
CONCLUÍDA** · 🟢 **ETAPA 3 (Preview) CONCLUÍDA e validada tecnicamente**.

> Este documento começou como auditoria técnica + plano de implementação. Após
> a conclusão da ETAPA 1 e da ETAPA 2 (commit `5a5c913`), o status foi
> atualizado para refletir as entregas realizadas. A ETAPA 3 (Preview e
> visualização de mídia) foi implementada (MessageBubble reutilizável, previews
> de imagem/vídeo/áudio/documento, signed URLs com cache) e validada via
> `tsc --noEmit` + build PWA. Pendências restantes: teste manual em dispositivo
> real (Personal e Aluno, todos os tipos de arquivo) e validação do download de
> documentos no APK/WebView.

---

## 1. Estado atual do sistema de chat

### 1.1 Arquivos envolvidos

**Types**
- `src/types/database.ts` — interfaces `Message` (linha 324) e `MessageInsert`
  (linha 349). Ambas já possuem campos de mídia PREPARADOS:
  `type`, `media_url`, `payload`, `event`, `extension`, `binary_payload`,
  `private`, `updated_at` (Sprint 10.1 preparou o schema; envio de mídia ainda
  não habilitado).
- `src/types/message.ts` — interface `Conversation` (studentId, studentName,
  lastMessage, lastMessageAt, unread, avatarUrl). Não tem suporte a mídia.

**Services**
- `src/services/messageService.ts` — `getMessages`, `sendMessage`,
  `getConversations`, `markMessagesAsRead`, `markMessageAsRead`,
  `markMessagesAsReadByIds`. Usa `.select()` (SELECT *) por causa da tabela
  não versionada.
- `src/services/pushTrigger.ts` — dispara `sendMessage` → `pushNewMessage`
  (integração Sprint 12).

**Hooks**
- `src/hooks/usePushNotifications.ts`, `usePushReceiver.ts` (Sprint 12).
- NÃO há hook de chat (ex.: `useChatMessages`) — a lógica vive dentro das
  páginas.

**Componentes de chat**
- `src/components/chat/AvatarWithStatus.tsx` — único componente compartilhado
  do módulo de chat.

**Páginas**
- `src/pages/personal/ChatPage.tsx` (800 linhas) — Personal.
- `src/pages/student/StudentChatPage.tsx` (708 linhas) — Aluno.

**Rotas** — `src/app/routes.tsx`: `/chat` (Personal, linha 372) e
`/student/chat` (Aluno, linha 446), ambas via `lazyPage`.

### 1.2 Fluxo de mensagens (atual — texto apenas)

```
Personal/Aluno → messageService.sendMessage({...})
   → INSERT em public.messages (.select().single())
   → setMessages(prev => [...prev, msg])   (otimista local)
   → void pushNewMessage(msg)              (best-effort, Sprint 12)

Realtime:
   canal postgres_changes (INSERT em messages)
   → filter por (trainer_id, student_id) ativos
   → novo msg agregado a setMessages
```

- Histórico: `getMessages` busca DESC com `limit+1`, aplica `.lt('created_at',
  before)` p/ paginação, reverte para ASC e separa `hasMore`.
- Conversas: `getConversations` faz 3 consultas em paralelo (messages +
  count + `getStudentsByTrainer`). Unread do trainer = mensagens do aluno
  ainda não lidas (`sender_role='student' AND read=false`).
- Mark-as-read: `markMessagesAsRead` atualiza `read=true` apenas para
  `sender_role='student'` (não marca as próprias mensagens do personal).

### 1.3 Estrutura da tabela `messages` (no banco — NÃO versionada no repo)

Colunas confirmadas pela interface/migrations:
`id` (uuid PK), `trainer_id`, `student_id`, `sender_id`, `sender_role`
('personal'|'student'), `content` (text), `type` (text), `media_url`,
`read` (bool), `created_at`, `updated_at`, `payload`, `event`, `extension`,
`binary_payload`, `private`.

> **IMPORTANTE**: a tabela `messages` foi criada fora dos migrations do repo
> (não versionada). `messageService` usa `.select()` (SELECT *) de propósito
> (Sprint 10.1 hotfix `0ac9099`): lista fixa de colunas quebrava o
> INSERT...RETURNING (HTTP 400). Ao ALTERAR o schema (novas colunas de mídia),
> **manter o `.select()` e/ou criar a migration versionada** — ver Risco R5.

### 1.4 Serviços, hooks e componentes — resumo

| Camada | Existe hoje | Precisa para Sprint 13 |
| ------ | ----------- | ---------------------- |
| Service de mensagens | `messageService` | estender ample p/ mídia |
| Service de storage | NÃO | **criar** (`mediaService`/`chatStorage`) |
| Hook de chat | NÃO | **criar** (`useChatMedia`) |
| Componentes de mídia | NÃO | **criar** (MessageMedia, ImageViewer, etc.) |
| Bubble de mensagem | inline duplicado nas 2 páginas | **extrair** `MessageBubble` |
| Compositor | textarea + botão send | adicionar seletor/ações de mídia |

### 1.5 Como funciona atualmente

- Chat 100% textual, duas páginas quase espelhadas (Personal/Aluno) com a lógica
  de realtime+presence+unread duplicada.
- `handleSend` em ambos: valida texto, chama `sendMessage`, adiciona à lista
  local, limpa campo.
- Bubbles: `max-w-[74%]`, `px-4 py-2.5`, data + check de leitura no rodapé.
  User bubble `bg-[#ff2a32]` (red), outro `bg-white/[0.08]`.
- Compositor `flex items-end gap-2 rounded-2xl border ... p-2` com textarea
  `rows={1}` + botão redonda com ícone `Send` + `Loader2` ao enviar.
- GetConversations inclui todos os alunos vinculados (Sprint 10.1 hotfix).

---

## 2. Recursos de mídia a planejar

- **Imagens** — JPG, PNG, WebP. Preview em linha; visualização expandida.
- **Vídeos** — MP4 (H.264), WebM. Player inline; stream/download.
- **Áudios** — MP3, M4A, WAV, OGG. Player inline (waveform/play).
- **Documentos** — PDF, DOC, DOCX, XLS, XLSX, TXT. Ícone + nome + tamanho;
  download/abertura.

Para cada tipo definir: extensão, MIME permitido, tamanho máximo, preview,
download. (Detalhado na arquitetura, seção 3.)

---

## 3. Arquitetura recomendada

### 3.1 Buckets Supabase Storage

Bucket único dedicado: **`chat-files`** (já referenciado e com política de
REVISÃO em `supabase/migrations/storage_policies_revision.sql` linhas 229-238 —
`chat_files_owner_all`, owner-by-pasta ou admin).

> ⚠️ Confirmar no Supabase se o bucket `chat-files` foi REALMENTE criado (a
> migration só define a POLICY; não vejo `insert into storage.buckets` no repo).
> Se não existir, criar manualmente (privado) antes de implementar — ver R4.

Imagens de mídia do chat NÃO devem usar buckets públicos (nada de
`progress-photos`/`avatars` que já existem para outros fins). Usar `chat-files`.

### 3.2 Estrutura de pastas

```
chat-files/
  <conversation_id ou par_ordenação>/
    <message_id>/<arquivo>
```

Opção recomendada (alinhada ao padrão das policies atuais de outras buckets e
ao vínculo personal↔aluno):

```
chat-files/
  {trainer_id}/
    {student_id}/
      {message_id}__{sanitized_filename}
```

Micro-decisions:
- As políticas de storage podem validar o owner pela pasta. Como `chat-files`
  já usa `(storage.foldername(name))[1] = auth.uid()` (owner_by_first_folder),
  o natural é **primeira pasta = user_id do REMETENTE**, segunda = o outro
  participante. Isso satisfaz automaticamente a policy `chat_files_owner_all`
  (auth.uid() = primeira pasta). Garante que somente o remetente (ativo) ou
  admin manipule; o destinatário lê via RLS de `messages` (não precisa policy
  pública).

### 3.3 Convenção de nomes

Padrão: `{media_type}/{conversation_key}/{message_id}_{safe_name}_{timestamp}`.

Exemplo real:
```
chat-files/personal_{uid}/{student_{uid}}/{msg_id}_foto-perfil_1722800000.jpg
```

Regras:
- Sem caracteres especiais perigosos: `_` ou `-` entre tokens; URL-safe.
- `encodeURIComponent` no nome original; sanitizar (`/[^\w.\-]/g`).
- Incluir id da conversa (personal+aluno) e id da mensagem p/ rastreabilidade e
  limpeza de órfãos.
- Nunca confiar no `Content-Type` do cliente; derivar de extensão/MIME check.

### 3.4 Estratégia de upload

1. Cliente valida (extensão, MIME, tamanho) no front (UX imediata).
2. `mediaService.uploadChatFile(file, {trainerId, studentId, messageId})`:
   - define a path (3.3);
   - `supabase.storage.from('chat-files').upload(path, file, { contentType,
     cacheControl: '3600', upsert: false })`;
   - retorna o `key`/path.
3. Depois chama `messageService.sendMessage({ content, type, media_url: key,
   extension, ... })` gravando a MESSAGE com a referência. **A mensagem só
   existe no chat após o upload OK** (evita mensagem órfã). Para robustez:
   upload primeiro → insert mensagem → se insert falhar, apagar o arquivo.
4. Estado de "enviando": preview local + ícone/spinner; mensagem entra na lista
   só após o retorno do INSERT.

> Considerar: para arquivos grandes (vídeo), `Capacitor` upload direto pode ser
> lento; avaliar resumable uploads do Supabase se necessário (POC em ETAPA 2).

### 3.5 Estratégia de download e preview

- **Preview privada**: o bucket é privado e a RLS de `messages` protege o
  acesso. Para exibir, gerar URL assinada:
  `supabase.storage.from('chat-files').createSignedUrl(path, 3600)` — tempo
  curto (1h) e renovado ao abrir. Melhor que publicUrl (vazamento).
- **Cache**: reaproveitar a signed URL enquanto válida; cachear a URL assinada
  em memória/state por mensagem (evita renovar a cada render, que estoura o
  limite de 10.000/dia de assinaturas). Para vídeos/áudios, `<video>/<audio>`
  com `src` = signed URL; o navegador/list android faz stream.
- **Download explícito**: trigger de download via signed URL (`?download=`).
- **Thumbnail de vídeo**: gerar na subida é complexo no Capacitor; alternativa
  simples: placeholder com ícone de play + duração (ou thumbnail se disponível).
  Não travar a Sprint nisso (ver R9).

### 3.6 Limites de tamanho

Propõem-se (configuráveis em uma const, não mágico):

| Tipo | Máx. recomendado | Motivo |
| ---- | ---------------- | ------ |
| Imagem | 10 MB | galeria de fotos; compressão sugerida no app |
| Vídeo | 25 MB | upload Capacitor direto fica limitado |
| Áudio | 15 MB | mensagens de voz curtas |
| Documento | 20 MB | PDFs/programas |

> O Supabase tem limite de upload pelo client (default ~50 MB via REST; para
> >~50 MB usar TUS). Para este escopo, 25 MB de teto global é seguro.

### 3.7 Tipos MIME permitidos

| Categoria | MIME permitidos | Extensões |
| --------- | --------------- | --------- |
| Imagem | image/jpeg, image/png, image/webp | .jpg .jpeg .png .webp |
| Vídeo | video/mp4, video/webm | .mp4 .webm |
| Áudio | audio/mpeg, audio/mp4, audio/wav, audio/ogg | .mp3 .m4a .wav .ogg |
| Documento | application/pdf, msword, ms-excel, text/plain, etc. | .pdf .doc .docx .xls .xlsx .txt |

Permitir apenas essa whitelist. **Rejeitar** qualquer outro MIME/executável.

### 3.8 Preview por tipo (estratégia)

- Imagem → `<Image>` com `object-contain`, gap de segurança; modal de zoom/ver
  expandida.
- Vídeo → `<video controls preload="metadata">`.
- Áudio → `<audio controls>` (player compacto).
- Documento → card (ícone + nome + tamanho) com botão "Baixar/Abrir".
- Fallback genérico (arquivo desconhecido) → card com ícone de arquivo + nome.

---

## 4. Segurança

### 4.1 Storage Policies (estado atual)

`storage_policies_revision.sql` define (para `chat-files`, linhas 229-238):

```sql
chat_files_owner_all: ALL TO authenticated
  USING (bucket_id='chat-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()))
  WITH CHECK (mesma condição);
```

### 4.2 RLS (tabela messages)

`20260731000000_rls_definitiva.sql` (MÓDULO 5) + manuais Sprint 10/11:
- student select/insert; student UPDATE (mark-as-read) — manual sql;
- trainer select/insert/update; admin all.
- Realtime publication cobre `messages` (sprint11 manual).

> **Gap (crítico para Sprint 13)**: para o DESTINATÁRIO baixar/visualizar a
> mídia do chat, ele depende de (a) conseguir SELECT na `messages` daquela
> mensagem (já cobre) e (b) ter acesso de leitura ao objeto no bucket. Com a
> policy `chat_files_owner_all` por owner-by-first-folder, o destinatário NÃO é
> o owner do arquivo → só obterá a signed URL via service/lógica no browser se
> `createSignedUrl` for permitido. Verificar: em buckets privados, signed URLs
> funcionam com RLS — o criador da assinatura precisa de SELECT no objeto.
> **Provável necessidade**: adicionar policy SELECT no bucket para o PAR
> personal↔aluno (semelhante às de `avatars`/`progress-photos`), OU usar a
> assinatura gerada via Edge Function com service_role, OU simplificar para uma
> policy que permita leitura ao vínculo (personal↔aluno) da mensagem. **Decisão
> de arquitetura pendente de validação em 4.4** — não implementar sem validar.

### 4.3 Permissões (resumo)

- Só PARTICIPANTES da conversa (personal ↔ aluno) veem/enviam.
- Remetente = owner físico do arquivo (pasta com uid).
- Admin já é irrestrito (`is_admin()`).
- Nada público no bucket `chat-files` (privado).

### 4.4 Validação de arquivos (defender por camadas)

1. **Cliente**: whitelist MIME/extension + tamanho (UX). Não é segurança.
2. **Storage policy**: owner = remetente (avoid outros gravarem na pasta).
3. **RLS messages**: rejeita INSERT com `sender_id` ≠ auth.uid() e sem vínculo.
4. **Sugestão (robustez)**: Edge Function opcional de upload/validação servindo
   como autoridade MIME/tamanho antes do commit — evita aceitar arquivo
   malicioso. Ou, mínimo: validar `sender_id/trainer/student` já no front via
   RLS. Documentar decisão em 4.4 durante implementação.

### 4.5 Exclusão de arquivos órfãos

- **Cenário 1 — upload OK, insert falhou**: apagar o arquivo no catch.
- **Cenário 2 — mensagem deletada no futura/soft delete**: hook/edge fn
  `remove` do bucket. Nesta Sprint, se não houver delete de mensagem, registrar
  como boa prática + rota manual.
- Política simples de rejeição: mensagem sempre guarda o `media_url` da storage;
  como convivem órfãos só em crash, um cron/limpeza manual p/ arquivos com
  `created_at` antigo e sem mensagem referenciada é opcional (R3).

---

## 5. Banco de dados — exatamente o que será necessário

> Nada é executado. Lista para a migration manual da Sprint 13
> (`supabase/sprint13_manual_migrations.sql` — aplicação MANUAL no Supabase).

### 5.1 Novas tabelas

**Nenhuma.** O modelo atual suporta mídia sem tabela nova. (Tudo dentro de
`messages` + `storage.objects`.)

### 5.2 Novas colunas em `messages`

A interface `Message` já as prevê; garantir no banco (se ainda não existem):

| Coluna | Tipo | Observação |
| ------ | ---- | ---------- |
| `media_url` | text NULL | caminho/chave no bucket (preferível à URL completa) |
| `type` | text DEFAULT 'text' | 'text' \| 'image' \| 'video' \| 'audio' \| 'file' \| 'document' |
| `extension` | text NULL | extensão original (p/ preview/valor) |
| `media_size` | bigint NULL | tamanho em bytes (novo, se útil p/ card de doc) |
| `mime` | text NULL | MIME validado no upload (opcional, redundância) |

> `payload`, `event`, `binary_payload`, `private`, `updated_at` já são previstos
> na interface — confirmar presença no banco; não precisam de alteração para
> mídia.

### 5.3 Novos índices

- `messages (trainer_id, student_id, created_at DESC)` — já usado pelo
  `getMessages`/conversas (provável que exista; confirmar).
- `messages (type)` — filtros futuros de mídia (opcional; volume baixo).
- Nenhum índice adicional obrigatório para o volume atual.

### 5.4 Novas policies

| Objeto | Policy | Regra |
| ------ | ------ | ----- |
| `storage.objects` bucket `chat-files` | **SELECT para o par** | permitir SELECT ao participante da conversa daquela mensagem (personal↔aluno), além do owner |
| `storage.objects` bucket `chat-files` | manter `chat_files_owner_all` (ALL owner/admin) | insert/update/delete do remetente |
| `messages` | (manter) student insert/update, trainer insert/update/select | sem novos, mas validar cobertura |

> A policy SELECT do par é o **item mais crítico** e o único estruturalmente
> novo de segurança (ver R2 e 4.4).

### 5.5 Migrations necessárias (aplicação manual, agente não executa DDL/RLS)

1. `supabase/sprint13_manual_migrations.sql` (novo arquivo):
   - `ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS ...` para
     as colunas de 5.2 (com `ALTER TABLE IF EXISTS` + guard `DO $$`).
   - storage policy SELECT p/ par no bucket `chat-files` (5.4).
2. Criação/confirmação do bucket `chat-files` (privado) via dashboard (R4) —
   sem INSERT em storage.buckets no repo até decisão.

---

## 6. Front-end

### 6.1 Componentes REUTILIZÁVEIS novos

- `MessageBubble.tsx` — extrai o bubble duplicado (Personal/Aluno): avatar,
  conteúdo (texto ou mídia via switch por `type`), horário, check de leitura.
- `MessageMedia.tsx` — renderiza mídia por tipo (image/video/audio/file) com
  preview + fallback.
- `MediaComposer.tsx` — substitui o compositor inline: textarea + botão anexo +
  pré-visualização do arquivo selecionado + ações (enviar/cancelar).
- `ImageViewer.tsx` — modal/visualização ampliada de imagem.
- `AudioPlayer.tsx` / `VideoPlayer.tsx` — players compactos (usar `<audio>`/
  `<video>`; sem lib extra se possível).
- `FileCard.tsx` — card de documento (ícone, nome, tamanho, baixar).
- `MediaUploadPreview.tsx` — thumbnail/preview local antes do envio.

### 6.2 Componentes novos de apoio

- `AttachmentButton.tsx` — botão de adicionar mídia no compositor.

### 6.3 Telas que sofrerão alteração

- `src/pages/personal/ChatPage.tsx` — usar `MessageBubble` + `MediaComposer`
  + hook; receber mídia.
- `src/pages/student/StudentChatPage.tsx` — idem.

### 6.4 Hooks a criar

- `useChatMedia.ts` — estado de arquivo selecionado, upload, progresso, erro;
  integra `mediaService` + `messageService` + preview.
- (Opcional) `useMediaUrl.ts` — cache de signed URLs por mensagem (evita
  renovar a cada render e o estouro do limite de assinaturas).

### 6.5 Services a criar/estender

- `src/services/mediaService.ts` (novo) — `uploadChatFile`, `getSignedUrl`,
  `downloadFile`, `buildPath`, `validateChatFile` (MIME/tamanho).
- `messageService` — sem mudança estrutural; os tipos `MessageInsert` já
  aceitam `type`/`media_url`/`extension` sem alteração (bom).

---

## 7. Plano de implementação (etapas)

> Ordem escolhida para validar infraestrutura cedo (Storage é o risco central) e
> tipos isoladamente, com preview/UX por último. Cada etapa termina com
> `tsc --noEmit` + `npm run build` (gate de qualidade).

### ETAPA 1 — Infraestrutura Storage
- **Objetivo**: bucket `chat-files` pronto + políticas + migration de colunas.
- **Arquivos**: `supabase/sprint13_manual_migrations.sql` (novo), docs,
  `mediaService.buildPath`.
- **Risco**: ALTO (base de tudo; policy SELECT do par é o item novo/crítico).
- **Impacto**: nulo no runtime (infra). Bloqueia tudo.
- **Critério de conclusão**: bucket existente+privado; colunas de 5.2 aplicadas;
  storage policy SELECT do par validada (assinatura funcionando p/ destinatário).

### ETAPA 2 — Upload
- **Objetivo**: `mediaService.uploadChatFile` + `useChatMedia` (upload+progresso+
  erro) + fluxo "upload → insert mensagem".
- **Arquivos**: `mediaService.ts`, `useChatMedia.ts`, `MessageInsert`.
- **Risco**: ALTO (lógica nuclear; lidar com falha→rollback apaga arquivo).
- **Impacto**: médio (só chamado internamente até etapas seguintes exporem UI).
- **Critério**: upload de arquivo de teste grava em `chat-files` e cria a
  mensagem com `media_url` e `type` corretos; falha no insert apaga o arquivo.

### ETAPA 3 — Imagens
- **Objetivo**: anexar imagem, upload, preview em-bubble e visualização ampliada.
- **Arquivos**: `MessageMedia`, `ImageViewer`, `MessageBubble`, compositor, 2 páginas.
- **Risco**: MÉDIO (UI; signed URL por imagem).
- **Impacto**: médio.
- **Critério**: enviar/receber imagem ponta a ponta (Personal↔Aluno); preview ok.

### ETAPA 4 — Vídeos
- **Objetivo**: anexar/upload/render `<video>` + placeholder/estado de enviando.
- **Arquivos**: `MessageMedia`, `VideoPlayer`, `useChatMedia`.
- **Risco**: ALTO (tamanho/peso; streaming da signed URL; limite de assinatura).
- **Impacto**: médio.
- **Critério**: vídeo reproduz de ponta a ponta; sem crash na URL assinada.

### ETAPA 5 — Áudios
- **Objetivo**: anexar/upload/render `<audio>`.
- **Arquivos**: `MediaComposer`, `MessageMedia`, `AudioPlayer`.
- **Risco**: BAIXO.
- **Impacto**: baixo.
- **Critério**: áudio de voz reproduz ponta a ponta.

### ETAPA 6 — Documentos
- **Objetivo**: anexar/upload/render `FileCard` + download.
- **Arquivos**: `MediaComposer`, `MessageMedia`, `FileCard`, `mediaService.download`.
- **Risco**: BAIXO.
- **Impacto**: baixo.
- **Critério**: PDF/doc abre/baixa ponta a ponta; extensões fora da whitelist
  rejeitadas (front) e não enviam.

### ETAPA 7 — Preview
- **Objetivo**: modal de imagem, player cheio, placeholder genérico, correção de
  URLs assinadas e cache (`useMediaUrl`).
- **Arquivos**: `ImageViewer`, `useMediaUrl`, `MessageMedia`.
- **Risco**: MÉDIO (limite de signed URLs; UX de erro).
- **Impacto**: médio.
- **Critério**: preview sem renovar URL a cada render; URLs vencidas tratadas.

### ETAPA 8 — Download
- **Objetivo**: download explícito via signed URL + feedback de progresso.
- **Arquivos**: `FileCard`, `mediaService.downloadFile`.
- **Risco**: BAIXO.
- **Impacto**: baixo.
- **Critério**: download salva arquivo corretamente no dispositivo.

### ETAPA 9 — UX
- **Objetivo**: estados de upload (progresso, erro, retry), layout do compositor
  com anexo, empty states, acessibilidade, limites claros por tipo.
- **Arquivos**: `MediaComposer`, `useChatMedia`, `MessageMedia`, páginas.
- **Risco**: MÉDIO (polish; estados de borda).
- **Impacto**: alto (percepção do produto).
- **Critério**: fluxos confortáveis; erros visíveis; sem regressão no chat textual.

### ETAPA 10 — Testes
- **Objetivo**: validar ponta a ponta cada tipo; build/TS; regressão do chat
  texto; revisão de segurança (RLS/policies).
- **Arquivos**: validação manual + revisão; sem novos testes automatizados
  (padrão do projeto é validação manual/preview).
- **Risco**: MÉDIO.
- **Impacto**: alto.
- **Critério**: todos os tipos funcionam Personal↔Aluno; `tsc --noEmit` e build
  em 0 erros; sem quebras no chat texto/push.

---

## 8. Riscos técnicos (re trabalho se não tratados antes)

- **R1 (crítico) — Policy SELECT do par no bucket `chat-files`**: sem, o
  destinatário não baixa a mídia. É o item novo de segurança da Sprint. Tratar
  na ETAPA 1 (não depois).
- **R2 (alto) — Signed URLs por mensagem vs. limite de assinaturas**: default
  Supabase cria ~10.000 assinaturas/hora; renderizar todas as mensagens renovando
  assinatura a cada render estoura. Cachear URL assinada (ETAPA 7) e expor só
  quando visível.
- **R3 (alto) — Arquivos órfãos**: falha entre upload e insert cria órfãos;
  sem limpeza, acumulam em `chat-files`. Garantir rollback apagar-arquivo +
  opcional corrida de limpeza.
- **R4 (médio) — Bucket `chat-files` pode não existir**: a migration só cria
  POLICY; se o bucket não foi criado no dashboard, uploads falham (404). Validar
  cedo (ETAPA 1) — risco de parecer "bug" tarde.
- **R5 (médio) — Tabela `messages` não versionada**: mudanças de schema fora do
  repo + `.select()` (SELECT *) funcionando. Ao adicionar colunas, não recriar
  lista fixa de colunas no select (rompe INSERT...RETURNING, Sprint 10.1).
- **R6 (médio) — Peso de vídeos no device**: upload Capacitor direto de vídeos
  grandes pode estourar/invanar. Limitar tamanho e considerar compressão/
  resumable do Supabase (ETAPA 4).
- **R7 (médio) — Duplicação Personal/Aluno**: mudar bubble/compositor em duas
  páginas espelhadas dobrar o trabalho. Extrair `MessageBubble`/`MediaComposer`
  cedo (ETAPA 3) — evita corrigir duas vezes.
- **R8 (baixo) — Expo/rollback de signed URL**: tempo de expiração curto p/
  docs/imagens grandes pode dar "quebrado" se usuário demora. Usar 1h e
  regenerar no clique.
- **R9 (baixo) — Thumbnail de vídeo**: gerar thumbnail é caro no Capacitor;
  não travar a Sprint. Placeholder + play é suficiente; thumbnail fica como
  melhoria.
- **R10 (baixo) — Vazamento de conteúdo sensível**: bucket PRIVADO + assinatura
  curta; não usar publicUrl para mídia do chat.

---

## 9. Recomendação final

**A arquitetura atual do VSFit JÁ SUPORTA a Sprint 13 com ajustes pontuais**
(não bloqueia):

- O modelo `messages` + tipos `Message`/`MessageInsert` já preveem mídia
  (`type`, `media_url`, `extension`) — sem tabela nova.
- Complementos necessários (não bloqueantes, mas OBRIGATÓRIOS antes das etapas
  de UI):
  1. **Migration manual** de colunas (5.2) + **policy SELECT do par** no bucket
     `chat-files` (5.4) — aplicação MANUAL no Supabase (agente não executa DDL).
  2. **Confirmar/criar o bucket `chat-files`** (privado) no dashboard.
  3. **Criar `mediaService` + `useChatMedia` + componentes extraídos**
     (`MessageBubble`/`MediaComposer`) — JÁ no início, pois a duplicação atual
     das páginas é o maior vetor de retrabalho.

**Ajuste estrutural recomendado ANTES de implementar**: extrair o bubble e o
compositor duplicados em componentes reutilizáveis (ETAPA 3, mas barato de
fazer já na ETAPA 1/2). Sem isso, cada tipo de mídia seria implementado duas
vezes.

**Nenhum commit, push, migration ou alteração de código foi feito** — apenas
documentação (ROADMAP/CHECKLIST/SPRINT-12) e este relatório/plano.