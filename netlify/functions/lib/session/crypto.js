// Chiffrement symétrique (AES-256-GCM) du contenu du cookie de session.
// Le secret ne doit jamais quitter le serveur : c'est ce qui garantit que le
// refresh token Google n'est jamais lisible/exploitable côté navigateur.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function deriveKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET n'est pas configuré côté serveur.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSession(payloadObject) {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payloadObject), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptSession(token) {
  if (!token) return null;
  try {
    const key = deriveKey();
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}
