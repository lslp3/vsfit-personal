# Sprint 12 — Push Notifications (Supabase + Firebase Cloud Messaging) (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-12-push` (repo lslp3/vsfit-personal).

Status: **VALIDAÇÃO FINAL (ETAPA 8) CONCLUÍDA** — Sprint **AGUARDANDO TESTES
REAIS**. Implementação completa, porém a Sprint NÃO é considerada encerrada
até a validação em dispositivo (Firebase + APK). Ajustes após isso viram
HOTFIX.

## Objetivo

Push notifications completas para Android (Supabase + FCM + Capacitor),
funcionando em foreground, background e terminated, com deep link, eventos de
negócio conectados e preferências por usuário.

## Regras

- Branch `test/sprint-12-push` (de `test/sprint-11-hardening`); sem merge na main.
- Cliente NÃO envia push: envio centralizado na Edge Function `send-push-notification`.
- Eventos padronizados (event_type) + payload estruturado (route + ids).
- Domínio push desacoplado dos módulos de negócio.
- SQL entregue em arquivo manual; banco não alterado pelo agente.

## Etapas / status

| Etapa | Tema | Status |
| ----- | ---- | ------ |
| 1 | Auditoria + arquitetura | ✅ concluída |
| 2 | FCM + Capacitor + Android + registro de token | ✅ concluída |
| 3 | Persistência (push_tokens/push_preferences) + pushService | ✅ concluída |
| 4 | Edge Function `send-push-notification` (envio reutilizável) | ✅ concluída |
| 5 | Eventos (mensagem, treino, pagamento, plano, sistema) + autorização | ✅ concluída |
| 6 | Recebimento foreground/background/terminated + deep link | ✅ concluída |
| 7 | Tela de preferências + gate central na Edge Function | ✅ concluída |
| 8 | Validação estática + revisão + preparação p/ testes reais | ✅ concluída (validação; testes reais pendentes) |

**A Sprint NÃO está encerrada** — falta a validação real em dispositivo
(Firebase configurado + APK + testes).

## Arquitetura

```
Cliente → Supabase (evento de negócio) → send-push-notification (service_role)
       → FCM → Dispositivo
```

- Eventos: NEW_MESSAGE, WORKOUT_COMPLETED, PAYMENT_APPROVED, PLAN_EXPIRING,
  SYSTEM_NOTIFICATION (+ STUDENT_CREATED preparado).
- Payload: event_type, route, trainer_id, student_id, conversation_id,
  notification_id, payment_id, etc.
- Autorização: usuário (self, admin ou par trainer↔aluno) ou contexto serviço
  (Bearer = SERVICE_ROLE_KEY).
- Preferências: gate central na Edge Function (push_preferences do
  destinatário; se categoria desligada → blocked; notificação no banco segue).

## Commits

| Commit | Descrição |
| ------ | --------- |
| `24c1dcc` | ETAPA 2 — Capacitor push plugin + Firebase/android config |
| `adab0bc` | ETAPA 2 – permissão e registro de token (hook) |
| `0b1ac8e` | docs(sprint12): track sprint and roadmap |
| `c6b471e` | ETAPA 3 – persistência push_tokens/preferences + pushService |
| `df6843f` | ETAPA 4 – send-push-notification edge function (reutilizável) |
| `f3f8650` | ETAPA 5 – eventos de negócio + autorização da edge function |
| `46614a0` | ETAPA 6 – recebimento/foreground/terminated + deep link/banner |
| `c084417` | ETAPA 7 – tela de preferências + gate de preferências |
| (fechamento) | validação ETAPA 8 (revisão + correção mínima do listener + docs) |

## Validação estática (ETAPA 8)

- [x] `npx tsc --noEmit` em 0 erros (todos os commits).
- [x] `npm run build` em 0 erros (todos os commits).
- Revisão de código: registro do token, refresh, logout, pushService,
  usePushNotifications, usePushReceiver, PushBanner, payloads, pushTrigger,
  edge function, autorização, preferências, deep links, foreground/
  background/terminated, tipos, imports, código morto, memory leaks (corrigido
  o cleanup de listeners no usePushReceiver), listeners duplicados, erros.

## Testes reais (checklist — a executar por você, após configurar Firebase)

- [ ] Login (solicita permissão + registra token)
- [ ] Logout (remove tokens do usuário)
- [ ] Registro do token (upsert em push_tokens)
- [ ] Atualização do token (refresh → update, sem duplicatas)
- [ ] Recebimento de push (mensagem, treino concluído, pagamento aprovado,
      plano vencendo)
- [ ] Foreground (banner interno; sem notificação duplicada do sistema)
- [ ] Background (bandeja do Android; toque navega)
- [ ] App fechado (terminated; toque abre e navega)
- [ ] Deep link (chat, notificações, preferências)
- [ ] Preferências ligadas (push chega)
- [ ] Preferências desligadas (push bloqueado; notificação no banco continua)
- [ ] Remoção de token inválido (FCM retorna token-not-registered)
- [ ] Múltiplos dispositivos (envio para todos os tokens do usuário)

## Firebase (configuração pendente — NÃO executada)

Quando a Sprint terminar (orientação do usuário, passo a passo):

- Criar projeto Firebase
- Baixar google-services.json (aplicativo com.vsfit.personal)
- Gerar Service Account (envio)
- Configurar secret FIREBASE_SERVICE_ACCOUNT (Supabase)
- Configurar secret GOOGLE_SERVICES_JSON (GitHub Actions)
- Deploy da Edge Function `send-push-notification`
- Aplicar `supabase/sprint12_manual_migrations.sql` (push_tokens + push_preferences)
- Gerar APK
- Testes reais

## Fechamento

A Sprint 12 será fechada oficialmente só APÓS a validação completa (testes
reais). Até lá, permanece como "aguardando validação final".