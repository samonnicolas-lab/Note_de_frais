import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { currentMonth, monthLabel } from "../utils/format";
import { ibanEstValide, nettoyerIban } from "../utils/iban";
import Spinner from "../components/Spinner";

export default function Reglages() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [erreurUsage, setErreurUsage] = useState(null);

  const [profil, setProfil] = useState({ nom: "", fonction: "", iban: "" });
  const [chargementProfil, setChargementProfil] = useState(true);
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [profilEnregistre, setProfilEnregistre] = useState(false);
  const [erreurProfil, setErreurProfil] = useState(null);
  const [avertissementIban, setAvertissementIban] = useState(null);

  useEffect(() => {
    let annule = false;
    api
      .usageMensuel()
      .then((data) => { if (!annule) setUsage(data); })
      .catch((err) => { if (!annule) setErreurUsage(err.message); })
      .finally(() => { if (!annule) setLoadingUsage(false); });
    return () => { annule = true; };
  }, []);

  useEffect(() => {
    let annule = false;
    api
      .obtenirProfil()
      .then((data) => { if (!annule) setProfil(data.profil); })
      .catch((err) => { if (!annule) setErreurProfil(err.message); })
      .finally(() => { if (!annule) setChargementProfil(false); });
    return () => { annule = true; };
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  const onEnregistrerProfil = async (event) => {
    event.preventDefault();
    setEnregistrementProfil(true);
    setErreurProfil(null);
    setAvertissementIban(null);
    setProfilEnregistre(false);

    // Un IBAN mal formé n'empêche jamais d'enregistrer le reste des informations :
    // on l'efface simplement et on prévient l'utilisateur, plutôt que de bloquer.
    const ibanSaisi = profil.iban.trim();
    const ibanValide = !ibanSaisi || ibanEstValide(ibanSaisi);
    const aCorriger = { ...profil, iban: ibanValide ? nettoyerIban(ibanSaisi) : "" };

    try {
      const data = await api.enregistrerProfil(aCorriger);
      setProfil(data.profil);
      setProfilEnregistre(true);
      if (!ibanValide) {
        setAvertissementIban(
          "L'IBAN saisi n'est pas valide (format international attendu, ex. FR76 1234 5678 9012 3456 7890 189). Le champ a été laissé vide — merci de le ressaisir correctement."
        );
      }
    } catch (err) {
      setErreurProfil(err.message || "L'enregistrement a échoué.");
    } finally {
      setEnregistrementProfil(false);
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Réglages</h1>
      </header>

      <div className="settings-card">
        <span className="text-muted">Compte Google connecté</span>
        <strong>{email || "Inconnu"}</strong>
      </div>

      <div className="settings-card">
        <span className="text-muted">Usage de l'IA — {monthLabel(currentMonth())}</span>
        {loadingUsage && <Spinner label="Chargement..." />}
        {!loadingUsage && erreurUsage && <div className="alert alert-error">{erreurUsage}</div>}
        {!loadingUsage && usage && (
          <div className="usage-stats">
            <div className="usage-stat">
              <strong>{usage.factures}</strong>
              <span className="text-muted text-small">facture{usage.factures > 1 ? "s" : ""} analysée{usage.factures > 1 ? "s" : ""}</span>
            </div>
            <div className="usage-stat">
              <strong>{usage.factures_restantes_estimees}</strong>
              <span className="text-muted text-small">factures restantes estimées ce mois</span>
            </div>
          </div>
        )}
        {!loadingUsage && usage?.plafond_atteint && (
          <div className="alert alert-warning">
            Le plafond mensuel d'analyse par IA est atteint. Les fournisseurs déjà reconnus continuent
            de fonctionner normalement ; les nouveaux justificatifs devront être saisis manuellement
            jusqu'au mois prochain.
          </div>
        )}
        <p className="text-muted text-small">
          Cette application utilise l'API Claude (Anthropic) pour lire vos factures automatiquement.
          Une seule clé API, payée par le développeur, est partagée par tous les utilisateurs de l'app.
          Pour éviter toute dérive, l'analyse par IA est limitée à environ 880 factures par mois au
          total (tous utilisateurs confondus) ; au-delà, elle est suspendue jusqu'au mois suivant. Les
          factures des fournisseurs déjà reconnues automatiquement continuent cependant de fonctionner
          normalement, sans passer par l'IA.
        </p>
        <p className="text-muted text-small">
          💙 Cette application est gratuite et financée personnellement par son développeur
          (hébergement + API IA). Si elle vous est utile, un don libre via Wero au 06 10 67 17 64 est
          apprécié — sans aucune obligation.
        </p>
      </div>

      <div className="settings-card">
        <span className="text-muted">Informations personnelles</span>
        <p className="text-small text-muted">
          Utilisées pour renseigner automatiquement l'en-tête de vos exports (nom, fonction, IBAN),
          si votre modèle Excel les prévoit.
        </p>
        {chargementProfil ? (
          <Spinner label="Chargement..." />
        ) : (
          <form className="form" onSubmit={onEnregistrerProfil}>
            <label className="field">
              <span>Nom complet</span>
              <input
                type="text"
                className="field-input"
                value={profil.nom}
                onChange={(e) => setProfil((p) => ({ ...p, nom: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Fonction</span>
              <input
                type="text"
                className="field-input"
                value={profil.fonction}
                onChange={(e) => setProfil((p) => ({ ...p, fonction: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>N° IBAN</span>
              <input
                type="text"
                className="field-input"
                value={profil.iban}
                onChange={(e) => setProfil((p) => ({ ...p, iban: e.target.value }))}
              />
            </label>

            {erreurProfil && <div className="alert alert-error">{erreurProfil}</div>}
            {avertissementIban && <div className="alert alert-warning">{avertissementIban}</div>}
            {profilEnregistre && <div className="alert alert-success">Enregistré ✓</div>}

            <button type="submit" className="btn btn-secondary btn-block" disabled={enregistrementProfil}>
              {enregistrementProfil ? <Spinner label="Enregistrement..." /> : "Enregistrer"}
            </button>
          </form>
        )}
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate("/modele-excel")}>
        Modèle Excel d'export
      </button>

      <button type="button" className="btn btn-secondary btn-block" onClick={onLogout}>
        Se déconnecter
      </button>
    </div>
  );
}
