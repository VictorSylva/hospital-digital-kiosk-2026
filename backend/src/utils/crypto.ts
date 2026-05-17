import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Helper to get exactly 32 bytes for the key, padded or truncated as necessary.
// In production, ENCRYPTION_KEY should exactly be 32 bytes.
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY || 'default-secret-key-that-is-at-least-32-chars';
  return crypto.createHash('sha256').update(String(key)).digest('base64').substring(0, 32) as unknown as Buffer;
};

export const encryptText = (text: string): { iv: string; encryptedData: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
};

export const decryptText = (encryptedData: string, ivHex: string): string => {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
