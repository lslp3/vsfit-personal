# Sprint 12 — Push Notifications (Supabase + Firebase Cloud Messaging) (VSFit)

Documento de acompanhamento da Sprint. Branch de trabalho:
`test/sprint-12-push` (repo lslp3/vsfit-personal).

Status: **EM ANDAMENTO**.

## Objetivo

Implementar push notifications completas para Android usando Supabase + FCM +
Capacitor, funcionando com o app aberto (foreground), em segundo plano
(background) e totalmente fechado (terminated).

## Regras

- Trabalhar SOMENTE na branch `test/sprint-12-push` (a partir de
  `test/sprint-11-hardening`); sem merge na `main`.
- Commits pequenos e atômicos; `npx tsc --noEmit` + `npm run build` (EXIT 0)
  antes de cada commit; push após cada commit.
- Cliente NÃO envia push: todo envio passa pela Edge Function (service_role).
- Eventos padronizados (event_type) e payload estruturado (route + ids).
- Domínio push DESACOPLADO de chat/workout/financeiro/notificações.
- Preferências de push: SEM interface nesta sprint (apenas estrutura de dados).
- Qualquer SQL entregue em arquivo para aplicação manual (banco não alterado
  pelo agente sem autorização).

## Arquitetura (aprovada)

```
Cliente → Supabase (evento de negócio) → Edge Function (service_role) → FCM → Dispositivo
```

### Eventos (event_type)
- NEW_MESSAGE, WORKOUT_COMPLETED, PAYMENT_APPROVED, PLAN_EXPIRING,
  SYSTEM_NOTIFICATION + STUDENT_CREATED (preparado, sem uso ainda).

### Payload
- event_type, route, trainer_id, student_id, conversation_id, notification_id
  (somente os campos necessários por evento).

### Decisões técnicas
- Plugin oficial `@capacitor/push-notifications@8.1.2` (Capacitor 8).
- google-services.json NÃO versionado (segredo); CI injeta
  `GOOGLE_SERVICES_JSON` condicionalmente; gradle aplica o plugin do Google
  Services somente se o arquivo existir (build continua verde sem FCM).
- Envio sempre pela Edge Function; cliente apenas registra token.

## Etapas / status

| Etapa | Tema | Status |
| ----- | ---- | ------ |
| 1 | Auditoria + relatório técnico | ✅ concluída |
| 2 | Integrar FCM · config Android · permissões · registrar token | ✅ concluída |
| 3 | Salvar token no Supabase (upsert/refresh/remover no logout) | ⏸️ |
| 4 | Infra de envio via Edge Function + serviço reutilizável | ⏸️ |
| 5 | Push por evento (mensagem, treino, pagamento, vencimento, sistema) | ⏸️ |
| 6 | Foreground/background/terminated + navegação ao tocar | ⏸️ |
| 7 | Preferências de push (estrutura; UI fora da sprint) | ⏸️ |
| 8 | Testes (Android, APK, Preview, build, realtime, duplicidade, token) | ⏸️ |

## Commits

| Commit | Descrição |
| ------ | --------- |
| `24c1dcc` | feat(push): add capacitor push-notifications plugin and firebase android config |
| `adab0bc` | feat(push): device permission and fcm token registration hook |
| (docs) | Documentação da Sprint (este arquivo + ROADMAP) |

## Dependências externas (necessárias para a feature funcionar)

- Criar projeto Firebase + `google-services.json` e um service account
  (supabase secret) — sem isso o APK não gera token/entrega pushes.
- Adicionar secret `GOOGLE_SERVICES_JSON` (base64) no GitHub (para o CI injetar).