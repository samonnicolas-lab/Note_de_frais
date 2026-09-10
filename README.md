# Notes de frais — Phase 1

Application web installable (PWA) pour scanner des factures/tickets, en extraire
automatiquement les informations via l'API Claude, les archiver sur Google Drive
et générer un export Excel mensuel.

Ce dépôt correspond à la **Phase 1** du projet (cf. cahier des charges). Les
phases suivantes (modèle Excel adaptable, signatures fournisseurs partagées,
modification a posteriori) ne sont volontairement pas implémentées, mais le
code est structuré pour les accueillir :

- `netlify/functions/lib/pipeline/` — pipeline d'extraction en plusieurs étapes
  (aujourd'hui : uniquement l'appel Claude vision). La Phase 3 y ajoutera une
  étape de vérification Supabase avant l'appel à Claude.
- `netlify/functions/lib/registre/` — abstraction du registre des dépenses
  (aujourd'hui : un fichier JSON sur Drive). Remplaçable sans toucher aux
  fonctions serverless qui l'utilisent.
- `netlify/functions/lib/export/` — génération de l'export Excel (aujourd'hui :
  colonnes fixes). La Phase 2 y branchera un mapping de colonnes personnalisé.
- Le modèle de données d'une dépense inclut un champ `statut` prévu pour la
  Phase 4 (modification a posteriori), même si aucune UI ne l'exploite encore.

Un compteur d'usage de l'API Claude est également suivi : chaque appel à
`analyser-facture` enregistre les tokens consommés dans
`Notes de frais/usage.json` sur le Drive de l'utilisateur (agrégé par mois :
nombre de factures analysées, tokens, coût estimé en USD — la devise réelle de
facturation Anthropic). Ce compteur est affiché dans l'écran Réglages
(`netlify/functions/lib/usage/`, fonction `usage-mensuel`).

## Stack

- Frontend : React + Vite, PWA (`vite-plugin-pwa`)
- Backend : fonctions serverless Netlify (format v2, ESM)
- OCR/extraction : API Claude (vision), appelée uniquement côté serveur
- Authentification + stockage : Google OAuth 2.0 (scope `drive.file` + `openid email`)
- Export Excel : ExcelJS

Aucune clé API ni secret n'est exposé côté navigateur : tous les appels à
Claude et à Google passent par les fonctions dans `netlify/functions/`.

## Configuration requise

1. **Google Cloud** : créer un projet, activer l'API Google Drive, créer des
   identifiants OAuth 2.0 (type "Application Web"). Ajouter comme URI de
   redirection autorisée : `https://<votre-site>.netlify.app/api/auth-google?action=callback`
   (et `http://localhost:8888/api/auth-google?action=callback` pour le dev local).
2. **Anthropic** : générer une clé API Claude.
3. Copier `.env.example` en `.env` et renseigner les variables (voir le fichier
   pour le détail). En production, renseigner les mêmes variables dans
   Netlify (Site settings → Environment variables) :
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `APP_BASE_URL` (URL publique du site)
   - `SESSION_SECRET` (générer avec
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Développement local

```bash
npm install
npm install -g netlify-cli   # une seule fois
netlify dev                  # sert le frontend Vite + les fonctions sur :8888
```

`netlify dev` charge automatiquement les variables du fichier `.env` et
proxy le frontend Vite avec les fonctions serverless sous `/api/*`.

## Build de production

```bash
npm run build
```

Le déploiement (Netlify) utilise `netlify.toml` : build `npm run build`,
dossier publié `dist/`, fonctions dans `netlify/functions/`.

## Icônes PWA

Les icônes (`public/icons/`) sont générées par un script sans dépendance
externe : `node scripts/generate-icons.mjs`. Elles peuvent être remplacées
par de vraies icônes de marque en gardant les mêmes noms de fichiers.

## Limites connues (Phase 1)

- Les fonctions Netlify synchrones plafonnent le corps de requête à ~6 Mo :
  les photos sont automatiquement compressées côté client avant l'envoi
  (analyse et archivage) pour rester sous cette limite.
- Le format HEIC n'est pas re-compressé côté client (le canvas ne sait pas le
  décoder) : il est envoyé tel quel à Claude, qui le supporte nativement.
