import type { SessionPayload, AuthUser } from "./types"

const SESSION_COOKIE_NAME = "minthy_session"
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days
const SECRET = "minthy-demo-secret-key-2026"

const encoder = new TextEncoder()

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/")
  return atob(padded)
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    iat: now,
    exp: now + SESSION_DURATION,
  }

  const payloadStr = base64UrlEncode(JSON.stringify(payload))
  const key = await getKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadStr))
  const sigStr = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))

  return `${payloadStr}.${sigStr}`
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [payloadStr, sigStr] = token.split(".")
    if (!payloadStr || !sigStr) return null

    const key = await getKey()
    const sigBytes = Uint8Array.from(base64UrlDecode(sigStr), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadStr))
    if (!valid) return null

    const payload: SessionPayload = JSON.parse(base64UrlDecode(payloadStr))

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION }
