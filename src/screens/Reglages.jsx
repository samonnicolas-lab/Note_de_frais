import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { currentMonth, monthLabel, formatUSD } from "../utils/format";
import Spinner from "../components/Spinner";

export default function Reglages() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [erreurUsage, setErreurUsage] = useState(null);

  useEffect(() => {
    let annule = false;
    api
      .usageMensuel()
      .then((data) => { if (!annule) setUsage(data); })
      .catch((err) => { if (!annule) setErreurUsage(err.message); })
      .finally(() => { if (!annule) setLoadingUsage(false); });
    return () => { annule = true; };
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
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
              <strong>{formatUSD(usage.cout_estime_usd)}</strong>
              <span className="text-muted text-small">coût estimé</span>
            </div>
          </div>
        )}
        <p className="text-muted text-small">
          Estimation indicative basée sur les tokens envoyés à l'API Claude. La facturation réelle
          reste disponible sur votre console Anthropic.
        </p>
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
