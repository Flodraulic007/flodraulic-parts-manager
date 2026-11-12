/** Signed session cookie (HMAC-SHA256, Web Crypto) — works in both proxy and server code. */
export const SESSION_COOKIE = "fd_session";
const MAX_AGE_S = 60 * 60 * 12; // 12 hours

const secret = () => process.env.AUTH_SECRET || "flodraulic-dev-secret-change-me";

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export interface SessionData {
  u: string; // username
  n: string; // display name
  exp: number;
}

export async function signSession(username: string, name: string) {
  const payload: SessionData = { u: username, n: name, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return { token: `${body}.${sig}`, maxAge: MAX_AGE_S };
}

export async function verifySession(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const sigBytes = Uint8Array.from(fromB64url(sig), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", await key(), sigBytes, enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(fromB64url(body)) as SessionData;
    if (data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}
