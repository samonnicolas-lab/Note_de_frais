// Aperçu d'un justificatif (photo ou PDF) avec un bouton "Agrandir" qui l'ouvre
// dans un nouvel onglet — l'utilisateur peut consulter le document en entier puis
// revenir sur cet onglet, la saisie du formulaire restant intacte.
export default function JustificatifPreview({ previewUrl, mimeType, driveUrl }) {
  const isPdf = mimeType === "application/pdf";

  const ouvrirEnGrand = () => {
    const url = previewUrl || driveUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!previewUrl && !driveUrl) return null;

  return (
    <div className="justificatif-preview-wrap">
      <div className="justificatif-preview" onClick={ouvrirEnGrand} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") ouvrirEnGrand(); }}
      >
        {previewUrl && !isPdf && <img src={previewUrl} alt="Aperçu du justificatif" />}
        {previewUrl && isPdf && <div className="pdf-placeholder">📄 Document PDF</div>}
        {!previewUrl && driveUrl && <div className="pdf-placeholder">🧾 Justificatif archivé</div>}
      </div>
      <button type="button" className="btn btn-link" onClick={ouvrirEnGrand}>
        Agrandir le justificatif ↗
      </button>
    </div>
  );
}
