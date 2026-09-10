// Compression côté client des photos avant envoi (analyse IA + archivage Drive).
// Objectif : rester sous la limite de payload des fonctions Netlify (~6 Mo en base64)
// tout en gardant une image lisible pour l'extraction et l'archivage.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  return blob || file;
}

/**
 * @returns {Promise<{ base64: string, mimeType: string, blob: Blob, fileName: string }>}
 */
export async function prepareFileForUpload(file) {
  const isCompressibleImage =
    file.type.startsWith("image/") && file.type !== "image/heic" && file.type !== "image/heif";

  if (!isCompressibleImage) {
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type, blob: file, fileName: file.name };
  }

  try {
    const compressed = await compressImageFile(file);
    const base64 = await fileToBase64(compressed);
    const fileName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { base64, mimeType: "image/jpeg", blob: compressed, fileName };
  } catch {
    // Si la compression échoue (navigateur trop ancien), on retombe sur le fichier original.
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type, blob: file, fileName: file.name };
  }
}
