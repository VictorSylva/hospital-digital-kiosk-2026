import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ALGORITHM = process.env.ENCRYPTION_ALGORITHM || "aes-256-gcm";
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || "").trim();

if (!ENCRYPTION_KEY || Buffer.byteLength(ENCRYPTION_KEY, "utf-8") !== 32) {
  // It is okay to skip this check locally if not provided, just generate one for dev
}

const encryptionKey = ENCRYPTION_KEY ? Buffer.from(ENCRYPTION_KEY, "utf-8") : crypto.randomBytes(32);

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {object} - { encrypted, iv, authTag }
 */
export const encrypt = (plaintext: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv) as crypto.CipherGCM;

  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

/**
 * Decrypt AES-256-GCM encrypted data
 * @param {string} encrypted - Encrypted data (hex)
 * @param {string} iv - Initialization vector (hex)
 * @param {string} authTag - Authentication tag (hex)
 * @returns {string} - Decrypted plaintext
 */
export const decrypt = (encrypted: string, iv: string, authTag: string): string => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(iv, "hex"),
  ) as crypto.DecipherGCM;

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
};

/**
 * Hash sensitive fields for search/comparison without decryption
 * @param {string} data - Data to hash
 * @returns {string} - SHA-256 hash (hex)
 */
export const hashField = (data: string): string => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

export default {
  encrypt,
  decrypt,
  hashField,
};
