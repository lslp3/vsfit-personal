/**
 * Sprint 12 — ETAPA 4 — Serviço interno de envio via FCM HTTP v1.
 *
 * Sem firebase-admin: gera JWT OAuth2 RS256 do service account, troca por
 * access_token e envia via https://fcm.googleapis.com/v1/projects/...
 *
 * Nenhuma credencial fixa: tudo vem do secret FIREBASE_SERVICE_ACCOUNT.
 * Best-effort — nunca lança para o chamador. Logs seguros: nunca imprimem
 * private_key/access_token/assertion.
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

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com" + "/token";
const FCM_PROJECTS_URL = "https://fcm.googleapis.com" + "/v1/projects";
const FCM_SEND_URL = FCM_PROJECTS_URL + "/{project_id}/messages:send";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

// Marcadores PEM construídos por concatenação (evita tratamento especial).
const PEM_PKCS8_BEGIN = "-----BEGIN " + "PRIVATE KEY-----";
const PEM_PKCS8_END = "-----END " + "PRIVATE KEY-----";
const PEM_PKCS1_BEGIN = "-----BEGIN " + "RSA PRIVATE KEY-----";
const PEM_PKCS1_END = "-----END " + "RSA PRIVATE KEY-----";

let cachedServiceAccount: ServiceAccount | null = null;

/**
 * Diagnóstico temporário: localiza a posição exata do caractere extra no
 * base64 da private_key e prova, via decodificação + ASN.1, se o conteúdo
 * (sem padding) já é um PKCS#8 válido. NÃO altera o comportamento.
 */
function diagnosePrivateKeyLength(normalized: string): string {
  const trailingEquals = normalized.match(/=+$/)?.[0]?.length ?? 0;
  const content =
    trailingEquals > 0 ? normalized.slice(0, -trailingEquals) : normalized;
  const firstPadIndex = normalized.length - trailingEquals; // 0-based

  let contentDecodable = false;
  let decodedBytes = 0;
  let asnDeclared = -1;

  if (content.length % 4 === 0) {
    try {
      const bin = atob(content);
      decodedBytes = bin.length;
      contentDecodable = true;

      // DER: SEQUENCE (0x30) + comprimento (short/long form).
      if (bin.charCodeAt(0) === 0x30 && bin.length >= 2) {
        const l1 = bin.charCodeAt(1);
        if ((l1 & 0x80) === 0) {
          asnDeclared = l1;
        } else {
          const n = l1 & 0x7f;
          if (bin.length >= 2 + n) {
            let len = 0;
            for (let i = 0; i < n; i++) len = (len << 8) | bin.charCodeAt(2 + i);
            asnDeclared = len;
          }
        }
      }
    } catch {
      contentDecodable = false;
    }
  }

  const before = normalized.slice(Math.max(0, firstPadIndex - 20), firstPadIndex);
  const after = normalized.slice(firstPadIndex, firstPadIndex + 20);

  return (
    `PKCS#8 diag: ` +
    `contentLen=${content.length}, ` +
    `contentMod4=${content.length % 4}, ` +
    `contentDecodable=${contentDecodable}, ` +
    `decodedBytes=${decodedBytes}, ` +
    `asn1DeclaredLen=${asnDeclared}, ` +
    `expectedRsa2048Pkcs8Bytes≈1218, ` +
    `extraCharIndex=${firstPadIndex}, ` +
    `extraChar=${JSON.stringify(normalized[firstPadIndex])}, ` +
    `before20=${JSON.stringify(before)}, ` +
    `after20=${JSON.stringify(after)}`
  );
}

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
  }

  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não é um JSON válido.");
  }

  if (!parsed.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT sem project_id.");
  }
  if (!parsed.client_email) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT sem client_email.");
  }
  if (!parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT sem private_key.");
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

function parsePrivateKey(pem: string): ArrayBuffer {
  // Normaliza o PEM vindo do secret FIREBASE_SERVICE_ACCOUNT:
  // aceita quebras REAIS e/ou LITERAIS ("\n", "\\n" — secret duplamente
  // escapado), remove os marcadores PEM (PKCS8 e PKCS1) e todo espaço.
  const normalized = pem
    .replace(/\\+n/g, "\n") // \n, \\n, \\\n -> newline real
    .replace(/\\+r/g, "") // \r, \\r -> nada
    .replace(/\r/g, "")
    .replaceAll(PEM_PKCS8_BEGIN, "")
    .replaceAll(PEM_PKCS8_END, "")
    .replaceAll(PEM_PKCS1_BEGIN, "")
    .replaceAll(PEM_PKCS1_END, "")
    .replace(/\s+/g, "");

  // ── DIAGNÓSTICO TEMPORÁRIO (remover após identificar a causa) ──────────
  const maskKey = (value: string) =>
    value.length <= 40
      ? `${value.slice(0, 10)}...${value.slice(-10)}`
      : `${value.slice(0, 20)}...${value.slice(-20)}`;

  const hasPemMarkers =
    pem.includes(PEM_PKCS8_BEGIN) || pem.includes(PEM_PKCS1_BEGIN);
  const hasEndMarkers =
    pem.includes(PEM_PKCS8_END) || pem.includes(PEM_PKCS1_END);

  console.error(
    "[send-push][diag] private_key: " +
      `length=${pem.length}, ` +
      `BEGIN=${hasPemMarkers}, ` +
      `END=${hasEndMarkers}, ` +
      `literalBackslashN=${pem.includes("\\n")}, ` +
      `realNewline=${pem.includes("\n")}, ` +
      `masked=${maskKey(pem)}`,
  );

  const validBase64 = /^[A-Za-z0-9+/=]*$/.test(normalized);
  const firstInvalid = [...normalized].find(
    (char) => !/[A-Za-z0-9+/=]/.test(char),
  );

  console.error(
    "[send-push][diag] atob input: " +
      `length=${normalized.length}, ` +
      `removedChars=${pem.length - normalized.length}, ` +
      `validBase64=${validBase64}` +
      (validBase64 ? "" : `, primeiroCaractereInvalido=${JSON.stringify(firstInvalid)}`),
  );

  // Diagnóstico do comprimento/padding (len % 4, '=' no final, cauda).
  const trailingEquals = normalized.match(/=+$/)?.[0]?.length ?? 0;
  const totalEquals = (normalized.match(/=/g) ?? []).length;
  console.error(
    "[send-push][diag] base64 length: " +
      `lengthMod4=${normalized.length % 4}, ` +
      `trailingEquals=${trailingEquals}, ` +
      `hasMiddleEquals=${totalEquals > trailingEquals}, ` +
      `last10=${JSON.stringify(normalized.slice(-10))}`,
  );

  // Diagnóstico ESTENDIDO: localiza a posição exata do caractere extra e
  // prova via decodificação + ASN.1 se o conteúdo já é um PKCS#8 válido.
  console.error("[send-push][diag] " + diagnosePrivateKeyLength(normalized));
  // ── FIM DIAGNÓSTICO TEMPORÁRIO ─────────────────────────────────────────

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    throw new Error(
      "private_key não é Base64 válido — verifique os marcadores PEM e quebras \\n no secret.",
    );
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer as ArrayBuffer;
}

let cachedSigningKey: CryptoKey | null = null;

async function getSigningKey(serviceAccount: ServiceAccount): Promise<CryptoKey> {
  if (cachedSigningKey) return cachedSigningKey;

  try {
    const der = parsePrivateKey(serviceAccount.private_key);

    cachedSigningKey = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch (error) {
    throw new Error(
      `Falha ao importar private_key: ${(error as Error).message}`,
    );
  }

  return cachedSigningKey;
}

async function signJwt(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: serviceAccount.token_uri ?? OAUTH_TOKEN_URL,
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
  const response = await fetch(serviceAccount.token_uri ?? OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const bodyText = await safeBodyText(response);
    // Loga status + erro OAuth (ex.: invalid_grant) — NUNCA a assertion.
    console.error(
      `[send-push] OAuth access_token falhou — HTTP ${response.status}: ${bodyText}`,
    );
    throw new Error(
      `Falha ao obter access_token (HTTP ${response.status}).`,
    );
  }

  const payload = await response.json().catch(() => null);
  const accessToken = payload?.access_token;
  if (!accessToken) {
    console.error("[send-push] OAuth2 resposta sem access_token.");
    throw new Error("Resposta OAuth2 sem access_token.");
  }

  const expiresIn = Number(payload?.expires_in ?? 3600);
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  };

  return accessToken;
}

/** Lê o corpo da resposta como texto seguro (não lança). */
async function safeBodyText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (text.length > 400) return text.slice(0, 400);
    return text;
  } catch {
    return "";
  }
}

/** Extrai { status, message } do erro FCM (seguro; sem token/secrets). */
async function extractFcmError(response: Response): Promise<{
  status: string;
  message: string;
}> {
  try {
    const payload = await response.json();
    return {
      status: String(payload?.error?.status ?? ""),
      message: String(payload?.error?.message ?? ""),
    };
  } catch {
    return { status: "", message: "" };
  }
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
    // corpo não-JSON: não classifica como token inválido.
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
  let projectId: string;

  try {
    const serviceAccount = getServiceAccount();
    projectId = serviceAccount.project_id;
    accessToken = await getAccessToken(serviceAccount);
    sendUrl = FCM_SEND_URL.replace("{project_id}", projectId);
  } catch (error) {
    console.error("[send-push] FCM autenticação falhou:", (error as Error).message);
    result.failed = tokens.length;
    return result;
  }

  console.info(`[send-push] Enviando para ${tokens.length} dispositivo(s) no projeto ${projectId}.`);

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

      const errorInfo = await extractFcmError(response);
      // Loga de forma SEGURA o erro retornado pelo FCM (sem token/secret).
      console.warn(
        `[send-push] FCM rejeitou envio — HTTP ${response.status}` +
          (errorInfo.status ? `, status=${errorInfo.status}` : "") +
          (errorInfo.message ? `, mensagem=${errorInfo.message}` : ""),
      );

      if (await isInvalidTokenError(response)) {
        result.removed += 1;
        try {
          await onInvalidToken(token);
          console.warn("[send-push] Token inválido removido do banco (best-effort).");
        } catch {
          // cleanup best-effort
        }
      }
    } catch (error) {
      result.failed += 1;
      console.warn("[send-push] erro de rede/envio:", (error as Error).message);
    }
  }

  return result;
}