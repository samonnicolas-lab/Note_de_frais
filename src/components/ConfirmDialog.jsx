import Spinner from "./Spinner";

export default function ConfirmDialog({ titre, message, confirmLabel = "Confirmer", enCours, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-panel">
        <h2>{titre}</h2>
        <p className="text-muted">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={enCours}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={enCours}>
            {enCours ? <Spinner label="Suppression..." /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
