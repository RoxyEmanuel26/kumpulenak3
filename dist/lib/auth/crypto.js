"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_crypto_1 = require("node:crypto");
/**
 * Hash a password using Node's native scrypt algorithm.
 * Returns a string in the format salt:hashedPassword.
 */
function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const hashedPassword = (0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex");
    return `${salt}:${hashedPassword}`;
}
/**
 * Verify a password against a stored salt:hashedPassword string.
 */
function verifyPassword(password, storedHash) {
    try {
        const [salt, hash] = storedHash.split(":");
        if (!salt || !hash)
            return false;
        const hashedPassword = (0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex");
        return (0, node_crypto_1.timingSafeEqual)(Buffer.from(hash, "hex"), Buffer.from(hashedPassword, "hex"));
    }
    catch (_a) {
        return false;
    }
}
