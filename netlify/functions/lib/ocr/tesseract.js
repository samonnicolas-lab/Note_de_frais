// Wrapper Tesseract.js. Le worker est mis en cache au niveau du module pour
// être réutilisé entre invocations sur un même conteneur Netlify "chaud"
// (évite de re-télécharger les données de langue à chaque facture).
//
// Important : figé sur tesseract.js@5.x — la version 7 plante avec une erreur
// WASM ("missing function DotProductSSE") sur certains runtimes Node ; la 5.x
// a été testée et fonctionne de façon fiable. Voir aussi le repli automatique
// sur Claude en cas d'échec, qui couvre un éventuel problème similaire en prod.
import { createWorker } from "tesseract.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Les données de langue françaises sont fournies avec la fonction (dossier
// lang-data/) plutôt que téléchargées depuis un CDN à chaque démarrage à froid :
// plus rapide, et pas de dépendance réseau externe supplémentaire en prod.
const LANG_PATH = join(dirname(fileURLToPath(import.meta.url)), "lang-data");

let workerPromise = null;

function obtenirWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("fra", 1, { langPath: LANG_PATH, cachePath: "/tmp" }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** @param {Buffer} image @returns {Promise<string>} texte brut reconnu. */
export async function reconnaitreTexte(image) {
  const worker = await obtenirWorker();
  const { data } = await worker.recognize(image);
  return data.text;
}
