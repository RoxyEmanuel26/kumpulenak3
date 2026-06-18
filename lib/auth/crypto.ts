import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hash a password using Node's native scrypt algorithm.
 * Returns a string in the format salt:hashedPassword.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

/**
 * Verify a password against a stored salt:hashedPassword string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    
    const hashedPassword = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashedPassword, "hex"));
  } catch {
    return false;
  }
}
