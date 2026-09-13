/** Fait échouer `promesse` avec une erreur si elle n'a pas abouti en `ms` millisecondes. */
export function avecDelai(promesse, ms, messageDelai = "Délai dépassé") {
  return Promise.race([
    promesse,
    new Promise((_, reject) => setTimeout(() => reject(new Error(messageDelai)), ms)),
  ]);
}
