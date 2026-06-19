/**
 * JWT utility using Web Crypto API (HMAC-SHA256).
 * Compatible with Next.js proxy (edge-compatible).
 *
 * SECURITY: JWT_SECRET MUST be set in .env. No fallback allowed.
 */

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[FATAL] JWT_SECRET is not defined. Set it in your .env file. " +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return secret;
}

// Helper to convert string or Uint8Array to Base64URL
function base64url(str: string | Uint8Array): string {
  const base64 = typeof str === "string" 
    ? btoa(unescape(encodeURIComponent(str)))
    : btoa(String.fromCharCode(...str));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(escape(atob(base64)));
}

// Convert secret string to CryptoKey
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a payload with HMAC-SHA256 and return a JWT string.
 * Automatically adds `iss` and `iat` claims.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function signJWT(payload: Record<string, any>): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  
  const enrichedPayload = {
    ...payload,
    iss: "kumpulenak3",
    iat: Date.now(),
  };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(enrichedPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
  const key = await getCryptoKey(getJwtSecret());
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(dataToSign)
  );
  
  const signature = base64url(new Uint8Array(signatureBuffer));
  return `${dataToSign}.${signature}`;
}

/**
 * Verify a JWT string and return the decoded payload if valid, or null if invalid/expired.
 * Validates `iss` claim and `exp` timestamp.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    
    const key = await getCryptoKey(getJwtSecret());
    const enc = new TextEncoder();
    
    // Decode signature with padding
    let base64Sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) {
      base64Sig += "=";
    }
    const sigString = atob(base64Sig);
    const sigBytes = new Uint8Array(sigString.length);
    for (let i = 0; i < sigString.length; i++) {
      sigBytes[i] = sigString.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(dataToVerify)
    );
    
    if (!isValid) return null;
    
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    
    // Validate issuer
    if (payload.iss !== "kumpulenak3") {
      return null;
    }
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
