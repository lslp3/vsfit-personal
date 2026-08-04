# Sprint 12 — Push Notifications (Supabase + Firebase Cloud Messaging) (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-12-push` (repo lslp3/vsfit-personal).

Status: ✅ **CONCLUÍDA E VALIDADA EM DISPOSITIVO REAL — PRONTA PARA PRODUÇÃO**.
Validação completa em Android (registro do token FCM, envio pela Edge Function,
app aberto, em segundo plano e fechado, atualização do token, fluxo ponta a
ponta). Ajustes futuros serão tratados como HOTFIX, preservando esta entrega
como fechada.

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
| 8 | Validação estática + revisão + preparação p/ testes reais | ✅ concluída |

**Sprint ENCERRADA** — validação real em dispositivo concluída e aprovada
(Firebase configurado + APK + testes ponta a ponta).

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

## Testes reais (validados em dispositivo — ETAPA 8 concluída)

- [x] Login (solicita permissão + registra token)
- [x] Logout (remove tokens do usuário)
- [x] Registro do token (upsert em push_tokens)
- [x] Atualização do token (refresh → update, sem duplicatas)
- [x] Recebimento de push (mensagem, treino concluído, pagamento aprovado,
      plano vencendo)
- [x] Foreground (banner interno; sem notificação duplicada do sistema)
- [x] Background (bandeja do Android; toque navega)
- [x] App fechado (terminated; toque abre e navega)
- [x] Deep link (chat, notificações, preferências)
- [x] Preferências ligadas (push chega)
- [x] Preferências desligadas (push bloqueado; notificação no banco continua)
- [x] Remoção de token inválido (FCM retorna token-not-registered)
- [x] Múltiplos dispositivos (envio para todos os tokens do usuário)

## Firebase (configurado e validado)

- Projeto Firebase criado
- google-services.json aplicado (aplicativo com.vsfit.personal)
- Service Account gerada (envio)
- Secret FIREBASE_SERVICE_ACCOUNT (Supabase) configurado
- Secret GOOGLE_SERVICES_JSON (GitHub Actions) configurado — corrigido para
  Base64 (o valor estava em JSON bruto e o `base64 -d` falhava com
  "base64: invalid input"; correção 100% no Secret, sem mudança de workflow)
- Edge Function `send-push-notification` deployada
- `supabase/sprint12_manual_migrations.sql` aplicado (push_tokens + push_preferences)
- APK gerado e instalado
- Testes reais concluídos

## Fechamento

✅ **Sprint 12 Concluída**
✅ **Validada em dispositivo real (Android)**
✅ **Pronta para Produção**

Nenhuma alteração funcional adicional será feita nesta Sprint; ajustes futuros
serão tratados como HOTFIX em branch própria.