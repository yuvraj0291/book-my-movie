import crypto from "crypto";

const COOKIE_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-key-at-least-32-chars-long-movie-rocks";

/**
 * Signs a payload and returns a secure base64-encoded token.
 */
export function signToken(payload: Record<string, any>, expiresInMs: number): string {
  const expiresAt = Date.now() + expiresInMs;
  const data = JSON.stringify({ ...payload, expiresAt });
  
  const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
  hmac.update(data);
  const signature = hmac.digest("hex");
  
  return Buffer.from(JSON.stringify({ data, signature })).toString("base64");
}

/**
 * Verifies a token and returns the parsed payload, or null if invalid or expired.
 */
export function verifyToken(token: string): Record<string, any> | null {
  try {
    const raw = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const { data, signature } = raw;
    
    const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");
    
    if (signature !== expectedSignature) return null;
    
    const parsed = JSON.parse(data);
    if (parsed.expiresAt < Date.now()) return null;
    
    return parsed;
  } catch (e) {
    return null;
  }
}
