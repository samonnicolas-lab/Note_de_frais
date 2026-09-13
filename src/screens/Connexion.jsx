import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const MESSAGES = {
  oauth_invalide: "La connexion a échoué (état invalide). Merci de réessayer.",
  refresh_token_absent: "Google n'a pas fourni d'autorisation persistante. Merci de réessayer.",
  echec_connexion: "La connexion à Google a échoué. Merci de réessayer.",
};

export default function Connexion() {
  const [params] = useSearchParams();
  const erreur = params.get("erreur");

  return (
    <div className="screen center-screen">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">🧾</div>
        <h1>Notes de frais</h1>
        <p className="text-muted">
          Scannez vos factures, laissez l'IA les lire, et archivez tout automatiquement sur votre
          Google Drive.
        </p>
        {erreur && <div className="alert alert-error">{MESSAGES[erreur] || "Une erreur est survenue."}</div>}
        <a className="btn btn-primary btn-block" href={api.loginUrl}>
          <span aria-hidden="true">🔐</span> Se connecter avec Google
        </a>
        <p className="text-muted text-small">
          L'application ne demande accès qu'aux fichiers qu'elle crée elle-même sur votre Drive.
        </p>
        <p className="text-muted text-small">
          <a href="/bienvenue">En savoir plus</a> · <a href="/politique-confidentialite">Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}
