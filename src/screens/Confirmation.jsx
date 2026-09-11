import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import { formatAmount, formatDateFr } from "../utils/format";

export default function Confirmation() {
  const navigate = useNavigate();
  const { depenseEnregistree, reset } = useScan();

  // Redirection en effet (pas pendant le rendu) : sinon un reset() du contexte
  // juste avant un navigate() ailleurs entre en concurrence avec cette redirection
  // et peut faire "gagner" /scanner au lieu de la destination cliquée.
  useEffect(() => {
    if (!depenseEnregistree) {
      navigate("/scanner", { replace: true });
    }
  }, [depenseEnregistree, navigate]);

  if (!depenseEnregistree) {
    return null;
  }

  const archivee = !!depenseEnregistree.justificatif_drive_url;

  return (
    <div className="screen center-screen">
      <div className="confirmation-card">
        <div className="confirmation-icon" aria-hidden="true">✅</div>
        <h1>Dépense enregistrée</h1>

        <div className="confirmation-summary">
          <strong>{depenseEnregistree.fournisseur}</strong>
          <span className="text-muted">{formatDateFr(depenseEnregistree.date)}</span>
          <span className="confirmation-amount">{formatAmount(depenseEnregistree.montant_ttc)}</span>
        </div>

        <ul className="status-list">
          <li className="status-item status-ok">Enregistré ✓</li>
          <li className={`status-item ${archivee ? "status-ok" : "status-warning"}`}>
            {archivee ? "Archivé sur Drive ✓" : "Justificatif non archivé"}
          </li>
        </ul>

        {archivee && (
          <a href={depenseEnregistree.justificatif_drive_url} target="_blank" rel="noreferrer" className="link-small">
            Voir le justificatif sur Drive
          </a>
        )}

        <div className="confirmation-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              reset();
              navigate("/scanner");
            }}
          >
            Scanner une nouvelle facture
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => {
              reset();
              navigate("/");
            }}
          >
            Voir mes dépenses
          </button>
        </div>
      </div>
    </div>
  );
}
