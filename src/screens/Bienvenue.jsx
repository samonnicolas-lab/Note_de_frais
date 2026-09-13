import { api } from "../api/client";

const ETAPES = [
  {
    emoji: "📸",
    titre: "Scannez",
    texte: "Prenez en photo un ticket ou une facture, ou importez directement un PDF.",
  },
  {
    emoji: "🤖",
    titre: "Laissez faire l'IA",
    texte: "Fournisseur, date, montants et catégorie sont extraits automatiquement.",
  },
  {
    emoji: "✅",
    titre: "Vérifiez",
    texte: "Un dernier coup d'œil avant enregistrement : rien n'est jamais archivé sans validation.",
  },
  {
    emoji: "📊",
    titre: "Exportez",
    texte: "Générez à tout moment un export Excel de vos notes de frais, selon votre propre modèle.",
  },
];

const POINTS_CLES = [
  {
    emoji: "🔒",
    titre: "Vos données restent chez vous",
    texte:
      "Aucune base de données tierce : vos factures et vos notes de frais sont enregistrées directement sur votre propre Google Drive.",
  },
  {
    emoji: "🆓",
    titre: "Gratuite, sans publicité",
    texte: "Application développée et financée à titre personnel, sans société ni collecte à des fins commerciales.",
  },
  {
    emoji: "🇫🇷",
    titre: "Pensée pour les notes de frais françaises",
    texte: "Dates, TVA et catégories adaptées à un usage professionnel courant en France.",
  },
];

export default function Bienvenue() {
  return (
    <div className="screen center-screen">
      <div className="login-card bienvenue-card">
        <div className="login-logo" aria-hidden="true">🧾</div>
        <h1>Notes de frais</h1>
        <p className="text-muted">
          Scannez vos factures, laissez l'IA les lire, et archivez tout automatiquement sur votre
          Google Drive.
        </p>

        <a className="btn btn-primary btn-block" href={api.loginUrl}>
          <span aria-hidden="true">🔐</span> Se connecter avec Google
        </a>

        <div className="bienvenue-etapes">
          {ETAPES.map((etape) => (
            <div key={etape.titre} className="bienvenue-etape">
              <span className="bienvenue-etape-emoji" aria-hidden="true">{etape.emoji}</span>
              <div>
                <strong>{etape.titre}</strong>
                <p className="text-muted text-small">{etape.texte}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bienvenue-points">
          {POINTS_CLES.map((point) => (
            <div key={point.titre} className="bienvenue-point">
              <span aria-hidden="true">{point.emoji}</span>
              <div>
                <strong>{point.titre}</strong>
                <p className="text-muted text-small">{point.texte}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-muted text-small">
          L'application ne demande accès qu'aux fichiers qu'elle crée elle-même sur votre Drive.
        </p>
        <p className="text-muted text-small">
          <a href="/politique-confidentialite">Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}
