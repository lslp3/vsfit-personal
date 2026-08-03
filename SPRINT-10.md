# Sprint 10 — Módulo de Comunicação (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-10-comunicacao` (repo lslp3/vsfit-personal).

Status: **CONCLUÍDA E VALIDADA NO PREVIEW — APROVADA** para integração futura.
Nenhuma alteração adicional será feita nesta Sprint; ajustes futuros serão tratados
como HOTFIX, preservando esta entrega como fechada.

## Objetivo da Sprint

Consolidar, higienizar e corrigir o módulo de comunicação já existente (chat,
notificações e presence) — **não** criar um chat novo. O módulo já contava com a
tabela canônica `messages`, realtime, páginas para Personal e Aluno, service de
mensagens, presença e notificações; a Sprint 10.1 teve como foco deixar esse
fluxo consistente, remover duplicações e código morto, e corrigir inconsistências
sem alterar comportamento entre papéis.

## Regras de escopo (vigentes em toda a Sprint)

- Proibido alterar: engine de treino, WorkoutBuilder, execução premium, persistência
  da execução, evolução do aluno (Sprint 9), financeiro, premium, auth, publicação
  de treino.
- Não reescrever o módulo de comunicação.
- Banco congelado: nenhuma alteração de banco executada pelo agente. Ajustes de
  RLS foram entregues somente como SQL para aplicação MANUAL no Supabase
  (`supabase/sprint10_manual_policies.sql`).
- Etapas com auditoria: `tsc --noEmit` + `npm run build` antes de cada commit;
  ambiente separado por etapa; sem merge na `main`.

## Funcionalidades implementadas (Sprint 10.1)

- **Consolidação de código compartilhado** (elimina duplicações entre as páginas
  Personal e Aluno):
  - `src/lib/chatPresence.ts` — `getPresenceUsers`/`formatLastSeen`/tipo `PresenceUser`.
  - `src/lib/textEncoding.ts` — `fixTextEncoding`/`cleanNotificationMessage`
    (correção byte a byte do mojibake Á/Í).
  - `src/lib/studentIdentity.ts` — `getStudentName`/`getTrainerName`/
    `getStudentAvatarUrl`/`getTrainerAvatarUrl`.
  - `src/components/chat/AvatarWithStatus.tsx`.
  - `src/services/notificationService.ts` — `getNotifications`,
    `markNotificationAsRead`, `toggleNotificationRead`, `markNotificationsAsRead`.
- **Higienização**: remoção de páginas órfãs sem rota/import
  (`student/ChatPage`, `HomePage`, `ProfilePage`, `ProgressPage`, `WorkoutsPage`,
  `NotificationsPage`).
- **`messageService`** alinhado à estrutura real de `messages` (campos
  `type`, `media_url`, `payload`, `event`, `extension`, `binary_payload`,
  `private`, `updated_at` preparados para a 10.2; envio de mídia ainda
  **não** habilitado). Correção do unread do treinador (somente mensagens do
  aluno contam) e do mark-as-read (não marca as próprias mensagens do personal);
  helpers `markMessageAsRead`/`markMessagesAsReadByIds`.
- **Notificações** — rota `/student/notifications` + item "Notificações" na
  bottom-nav do Aluno; páginas usam `notificationService`; realtime
  `postgres_changes` (INSERT) com cleanup de channel e carregamento silencioso.
- **Chat** — fluxo de read/unread consistente entre Personal e Aluno.

## Hotfixes realizados

1. **`0ac9099`** — `fix(chat): restaurar .select() no messageService para o schema real de messages`
   O `MESSAGE_COLUMNS` fixo (16 colunas) incluía colunas não confirmadas no
   `information_schema` (a tabela `messages` não é versionada no repo, criada
   fora dos migrations). O `INSERT...RETURNING` falhava com HTTP 400, revertia
   o INSERT e a mensagem nunca era criada. Corrigido restaurando `.select()`
   (SELECT *) em `getMessages`/`sendMessage`. Assinatura estendida de
   `sendMessage` preservada (preparada para mídia na 10.2).

2. **`77afcf9`** — `hotfix(chat): lista de conversas do Personal mostra todos os alunos`
   `getConversations` dependia apenas da tabela `messages`, então alunos sem
   conversa ficavam invisíveis na lista do Personal. Passou a buscar
   `getStudentsByTrainer()` em paralelo; alunos sem conversa entram como
   conversa vazia ao final da lista ("Sem mensagens ainda"); após a primeira
   mensagem, o realtime re-executa `getConversations` e o aluno sobe para a
   posição correta pela data da última mensagem. Sem mudança de banco, RLS,
   realtime, presence ou unread.

## Commits da Sprint

| Commit | Descrição |
| ------ | --------- |
| `75be443` | Sprint 10.1 — consolidação do módulo de comunicação (chat + notificações + presence) |
| `0ac9099` | Hotfix — restaurar .select() no messageService (schema real de messages) |
| `77afcf9` | Hotfix — lista de conversas do Personal mostra todos os alunos |
| (docs) | Documentação oficial da Sprint 10 (este arquivo + ROADMAP.md) |

## Testes executados

Validação manual no Preview, cobrindo:

- [x] Chat em tempo real Personal ↔ Aluno
- [x] Envio e recebimento de mensagens
- [x] Primeira mensagem para alunos sem histórico
- [x] Lista do Personal mostrando todos os alunos vinculados
- [x] Ordenação automática das conversas
- [x] Contador de mensagens não lidas
- [x] Marcação de mensagens como lidas
- [x] Presence (online/offline)
- [x] Tela de notificações funcionando
- [x] Build e TypeScript sem erros
- [x] Nenhuma regressão encontrada

## Resultado da validação no Preview

Sprint **100% validada** pelo responsável no Preview. Todos os testes listados
acima passaram. O módulo de comunicação encontra-se estável, replicante em
Personal e Aluno, com o fluxo completo de envio/realtime/presence/notificações.

## Status final

✅ **Sprint 10.1 Concluída**
✅ **Validada no Preview**
✅ **Aprovada**
✅ **Pronta para integração futura**

Nenhuma alteração funcional adicional será feita nesta Sprint; ajustes futuros
serão tratados como HOTFIX em branch própria.