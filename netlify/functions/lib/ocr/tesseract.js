// Wrapper Tesseract.js. Le worker est mis en cache au niveau du module pour
// être réutilisé entre invocations sur un même conteneur Netlify "chaud"
// (évite de re-télécharger les données de langue à chaque facture).
//
// Important : figé sur tesseract.js@5.x — la version 7 plante avec une erreur
// WASM ("missing function DotProductSSE") sur certains runtimes Node ; la 5.x
// a été testée et fonctionne de façon fiable. Voir aussi le repli automatique
// sur Claude en cas d'échec, qui couvre un éventuel problème similaire en prod.
import { createWorker } from "tesseract.js";
import { join } from "node:path";

// Les données de langue françaises sont fournies avec la fonction (dossier
// lang-data/, forcé dans le paquet via `included_files` dans netlify.toml)
// plutôt que téléchargées depuis un CDN à chaque démarrage à froid.
//
// On ancre ce chemin sur `process.cwd()` (= "/var/task" sur Lambda/Netlify)
// plutôt que sur `import.meta.url` : esbuild regroupe ce fichier avec le
// reste du code de la fonction dans un seul bundle, donc `import.meta.url`
// pointe alors sur l'emplacement du bundle et non plus sur ce fichier source
// — ce qui donnait un chemin erroné en production (constaté via un ENOENT).
const LANG_PATH = join(process.cwd(), "netlify/functions/lib/ocr/lang-data");

let workerPromise = null;

function obtenirWorker() {
  if (!workerPromise) {
    console.log("[OCR] création du worker Tesseract...");
    const t0 = Date.now();
    workerPromise = createWorker("fra", 1, { langPath: LANG_PATH, cachePath: "/tmp" })
      .then((worker) => {
        console.log(`[OCR] worker Tesseract prêt en ${Date.now() - t0} ms`);
        return worker;
      })
      .catch((err) => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

/** @param {Buffer} image @returns {Promise<string>} texte brut reconnu. */
export async function reconnaitreTexte(image) {
  const worker = await obtenirWorker();
  console.log(`[OCR] appel worker.recognize() sur une image de ${image.length} octets...`);
  const t0 = Date.now();
  const { data } = await worker.recognize(image);
  console.log(`[OCR] worker.recognize() terminé en ${Date.now() - t0} ms`);
  return data.text;
}
