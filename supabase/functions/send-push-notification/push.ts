/**
 * Sprint 12 — ETAPA 4 — Serviço interno de envio via FCM HTTP v1.
 *
 * Sem firebase-admin: gera um JWT OAuth2 RS256 a partir do service account,
 * obtém access_token e envia via https://fcm.googleapis.com/v1/projects/...
 *
 * Nenhuma credencial fixa: tudo vem do secret FIREBASE_SERVICE_ACCOUNT.
 * Best-effort — nunca lança para o chamador. Usa WebCrypto/Deno (compatível
 * com o Supabase Edge Runtime atual).
 */

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface SendResult {
  sent: number;
  failed: number;
  removed: number;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_PROJECTS_ENDPOINT = "https://fcm.googleapis.com" + "/v1/projects";
const FCM_SEND_URL = FCM_PROJECTS_ENDPOINT + "/{project_id}/messages:send";

// Marcadores PEM construídos por concatenação (evita tratamento especial
// de texto no tooling).
const PEM_BEGIN = "-----BEGIN " + "PRIVATE KEY-----";
const PEM_END = "-----END " + "PRIVATE KEY-----";

let cachedServiceAccount: ServiceAccount | null = null;

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
  }

  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT inválida (faltam campos-chave).");
  }

  cachedServiceAccount = parsed;
  return parsed;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replaceAll(PEM_BEGIN, "")
    .replaceAll(PEM_END, "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

let cachedSigningKey: CryptoKey | null = null;

async function getSigningKey(serviceAccount: ServiceAccount): Promise<CryptoKey> {
  if (cachedSigningKey) return cachedSigningKey;

  const der = pemToDer(serviceAccount.private_key);
  cachedSigningKey = await crypto.subtle.importKey(
    "pkcs8",
    der.buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return cachedSigningKey;
}

async function signJwt(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri ?? TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const signingInput =
    `${base64UrlEncode(JSON.stringify(header))}.` +
    `${base64UrlEncode(JSON.stringify(claims))}`;

  const key = await getSigningKey(serviceAccount);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput).buffer as ArrayBuffer,
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const assertion = await signJwt(serviceAccount);
  const response = await fetch(serviceAccount.token_uri ?? TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao obter access_token (HTTP ${response.status}).`);
  }

  const payload = await response.json();
  const accessToken = payload?.access_token;
  if (!accessToken) {
    throw new Error("Resposta OAuth2 sem access_token.");
  }

  const expiresIn = Number(payload?.expires_in ?? 3600);
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  };

  return accessToken;
}

async function isInvalidTokenError(response: Response): Promise<boolean> {
  try {
    const payload = await response.json();
    const status = String(payload?.error?.status ?? "");
    const message = String(payload?.error?.message ?? "");

    if (status === "UNREGISTERED") return true;
    if (
      status === "INVALID_ARGUMENT" &&
      /registration.?token|not registered|invalid registration/i.test(message)
    ) {
      return true;
    }

    const details = payload?.error?.details;
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (String(detail?.code ?? "") === "UNREGISTERED") return true;
      }
    }
  } catch {
    // corpo não-JSON: considera válido.
  }

  return false;
}

export async function sendToTokens(
  tokens: string[],
  message: PushMessage,
  onInvalidToken: (token: string) => void | Promise<void>,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, removed: 0 };

  if (tokens.length === 0) return result;

  let accessToken: string;
  let sendUrl: string;

  try {
    const serviceAccount = getServiceAccount();
    accessToken = await getAccessToken(serviceAccount);
    sendUrl = FCM_SEND_URL.replace("{project_id}", serviceAccount.project_id);
  } catch (error) {
    console.error("[send-push] FCM auth error:", error);
    result.failed = tokens.length;
    return result;
  }

  for (const token of tokens) {
    try {
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: message.data,
            android: { priority: "high" },
          },
        }),
      });

      if (response.ok) {
        result.sent += 1;
        continue;
      }

      result.failed += 1;

      if (await isInvalidTokenError(response)) {
        result.removed += 1;
        try {
          await onInvalidToken(token);
        } catch {
          // limpeza best-effort
        }
      }
    } catch (error) {
      result.failed += 1;
      console.warn("[send-push] send error:", error);
    }
  }

  return result;
}