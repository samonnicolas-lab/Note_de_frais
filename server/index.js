// Point d'entrée du serveur Node pour un hébergement VPS (en remplacement du
// routage interne des Netlify Functions). Réutilise TELS QUELS les fichiers
// de netlify/functions/*.js (export default async (request) => Response,
// déjà 100% API Fetch standard) : aucune ligne de logique métier n'est
// dupliquée ou réécrite ici, seul le "branchement" change. Ne sert PAS les
// fichiers statiques (dist/) : c'est le rôle de Caddy en reverse proxy
// devant ce process, qui ne reçoit que /api/*.
import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT) || 3000;
const FUNCTIONS_DIR = join(process.cwd(), "netlify/functions");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function nodeRequestToFetchRequest(req, bodyBuffer) {
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const init = { method: req.method, headers };
  if (bodyBuffer.length > 0 && req.method !== "GET" && req.method !== "HEAD") {
    init.body = bodyBuffer;
  }
  return new Request(url, init);
}

async function fetchResponseToNodeResponse(fetchResponse, res) {
  const headers = {};
  for (const [key, value] of fetchResponse.headers.entries()) headers[key] = value;
  res.writeHead(fetchResponse.status, headers);
  const buffer = Buffer.from(await fetchResponse.arrayBuffer());
  res.end(buffer);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (!url.pathname.startsWith("/api/")) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found (ce serveur ne sert que /api/* — les fichiers statiques sont servis par Caddy).");
    return;
  }

  const nomFonction = url.pathname.slice("/api/".length).split("/")[0];
  const cheminFichier = join(FUNCTIONS_DIR, `${nomFonction}.js`);

  try {
    await access(cheminFichier);
  } catch {
    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: `Fonction '${nomFonction}' introuvable.` }));
    return;
  }

  try {
    const module = await import(pathToFileURL(cheminFichier).href);
    const handler = module.default;
    if (typeof handler !== "function") throw new Error("Pas de export default function.");

    const bodyBuffer = await readBody(req);
    const fetchRequest = nodeRequestToFetchRequest(req, bodyBuffer);
    const fetchResponse = await handler(fetchRequest);
    await fetchResponseToNodeResponse(fetchResponse, res);
  } catch (err) {
    console.error(`[server] Erreur sur /api/${nomFonction} :`, err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Erreur interne du serveur." }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`[server] API démarrée sur le port ${PORT} (cwd=${process.cwd()}).`);
});

// Supabase se met en pause après 7 jours sans activité (cf.
// netlify/functions/ping-supabase.js, dont l'export `config.schedule`
// pensé pour Netlify est ignoré ici). En process long-vivant, un
// setInterval fait exactement le même travail sans dépendre d'un
// ordonnanceur externe : un ping au démarrage, puis un par jour.
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

async function pingSupabase() {
  const module = await import(pathToFileURL(join(FUNCTIONS_DIR, "ping-supabase.js")).href);
  await module.default();
}

pingSupabase().catch((err) => console.error("[scheduler] Échec du ping Supabase initial :", err));
setInterval(() => {
  pingSupabase().catch((err) => console.error("[scheduler] Échec du ping Supabase planifié :", err));
}, UN_JOUR_MS);
