/**
 * Sprint 12 — ETAPA 4 — Serviço interno de envio via Firebase Cloud Messaging.
 *
 * Reutilizável e desacoplado: NÃO contém lógica de negócio (quem envia, para
 * que evento) — apenas "enviar esta mensagem para estes tokens" e limpar
 * tokens inválidos. Nenhuma credencial fixa: tudo vem do secret
 * FIREBASE_SERVICE_ACCOUNT (JSON do service account do Firebase).
 *
 * Uso:
 *   const result = await sendToDevices(tokens, { title, body, data }, onInvalid);
 */

import {
  cert,
  getApps,
  initializeApp,
  getMessaging,
  type App,
} from "npm:firebase-admin@12.7.0";

/** Mensagem normalizada para o FCM. `data` deve conter apenas strings. */
export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

/** Resumo do envio, agregado e nunca lança erro para o chamador. */
export interface SendResult {
  sent: number;
  failed: number;
  removed: number;
}

/**
 * Códigos de erro do FCM que indicam token inválido/cadastrado em outro local.
 * Quando detectados, o token é removido do banco automaticamente.
 */
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/mismatched-credential",
]);

let firebaseApp: App | null = null;

/**
 * Inicializa (lazy) o app Firebase Admin a partir do secret
 * FIREBASE_SERVICE_ACCOUNT. Lança erro se não configurado/inválido — o
 * chamador trata como best-effort (não interrompe o fluxo do sistema).
 */
export function getFirebaseApp(): App {
  if (firebaseApp) return firebaseApp;

  const existing = getApps();
  if (existing.length > 0) {
    firebaseApp = existing[0];
    return firebaseApp;
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT não configurada (secret obrigatório).",
    );
  }

  let serviceAccount: Record<string, string>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT inválida (não é um JSON válido).");
  }

  firebaseApp = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
  return firebaseApp;
}

/**
 * Envia uma mensagem para um lote de tokens de dispositivo.
 * - Só não falha: resultados são agregados em SendResult.
 * - Tokens inválidos: chamam onInvalidToken(token) para limpeza no banco.
 * - Nunca lança erro para não interromper o fluxo do sistema.
 */
export async function sendToTokens(
  tokens: string[],
  message: PushMessage,
  onInvalidToken: (token: string) => void | Promise<void>,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, removed: 0 };

  if (tokens.length === 0) return result;

  const messaging = getMessaging(getFirebaseApp());

  const messages = tokens.map((token) => ({
    token,
    notification: { title: message.title, body: message.body },
    data: message.data,
    android: { priority: "high" as const },
  }));

  const responses = await messaging.sendEach(messages);

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];

    if (response.success) {
      result.sent += 1;
      continue;
    }

    result.failed += 1;

    const code = response.error?.code ?? "";
    if (INVALID_TOKEN_CODES.has(code)) {
      result.removed += 1;
      try {
        await onInvalidToken(tokens[i]);
      } catch {
        // Cleanup de token inválido é best-effort.
      }
    }
  }

  return result;
}