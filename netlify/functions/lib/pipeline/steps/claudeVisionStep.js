// Étape du pipeline d'extraction : appel à l'API Claude (vision) pour lire une
// facture/ticket (image ou PDF) et en extraire les champs structurés.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

const CATEGORIES = ["Transport", "Repas", "Hébergement", "Fournitures", "Autre"];

const EXTRACT_TOOL = {
  name: "extraire_facture",
  description:
    "Enregistre les informations structurées extraites d'une facture ou d'un ticket de caisse.",
  input_schema: {
    type: "object",
    properties: {
      fournisseur: { type: "string", description: "Nom du commerçant/fournisseur." },
      date: { type: "string", description: "Date de la facture au format YYYY-MM-DD." },
      categorie: { type: "string", enum: CATEGORIES },
      montant_ht: { type: "number", description: "Montant hors taxes." },
      montant_ttc: { type: "number", description: "Montant toutes taxes comprises." },
      tva: {
        type: "array",
        items: {
          type: "object",
          properties: {
            taux: { type: "number", description: "Taux de TVA en pourcentage, ex: 20" },
            montant: { type: "number", description: "Montant de TVA pour ce taux." },
          },
          required: ["taux", "montant"],
        },
      },
      confiance: {
        type: "string",
        enum: ["haute", "moyenne", "faible"],
        description:
          "Niveau de confiance global de l'extraction : 'faible' ou 'moyenne' si un champ est illisible, ambigu ou déduit.",
      },
    },
    required: ["fournisseur", "date", "categorie", "montant_ht", "montant_ttc", "tva", "confiance"],
  },
};

const SYSTEM_PROMPT = `Tu es un assistant qui lit des factures et tickets de caisse français ou étrangers
pour de la gestion de notes de frais professionnelles. Analyse le document fourni et
appelle l'outil "extraire_facture" avec les informations trouvées.

Règles :
- Si le document est en devise étrangère, indique quand même les montants numériques tels qu'imprimés.
- Choisis la catégorie la plus proche parmi : Transport, Repas, Hébergement, Fournitures, Autre.
- Si la TVA n'est pas détaillée par taux, mets un tableau avec un seul taux global si déductible, sinon un tableau vide.
- Le champ "confiance" doit refléter honnêtement ta certitude : "faible" si le document est flou,
  partiellement coupé, ou si tu dois deviner une valeur ; "moyenne" en cas de doute partiel ; "haute"
  seulement si tous les champs sont lisibles sans ambiguïté.
- Ne renvoie jamais de texte hors de l'appel d'outil.`;

function buildContentBlock(base64Data, mimeType) {
  if (mimeType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: mimeType, data: base64Data } };
  }
  return { type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } };
}

/**
 * @param {{ base64Data: string, mimeType: string }} input
 * @returns {Promise<object>} JSON structuré conforme au schéma du cahier des charges §3.
 */
export async function claudeVisionStep({ base64Data, mimeType }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configuré côté serveur.");
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extraire_facture" },
      messages: [
        {
          role: "user",
          content: [
            buildContentBlock(base64Data, mimeType),
            { type: "text", text: "Voici le document à analyser." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Échec de l'appel à l'API Claude (${response.status}) : ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const toolUse = (data.content || []).find((block) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("La réponse de Claude ne contient pas de résultat structuré exploitable.");
  }
  return toolUse.input;
}
