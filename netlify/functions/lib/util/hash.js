import { createHash } from "node:crypto";

/** Empreinte SHA-256 (hex) d'un buffer, utilisée pour détecter un justificatif déjà importé. */
export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
