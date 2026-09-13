import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import { api } from "../api/client";
import DepenseFieldsForm from "../components/DepenseFieldsForm";
import JustificatifPreview from "../components/JustificatifPreview";
import { formatAmount, formatDateFr } from "../utils/format";
import Spinner from "../components/Spinner";

export default function Verification() {
  const navigate = useNavigate();
  const { extraction, form, updateField, previewUrl, prepared, setDepenseEnregistree } = useScan();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [doublon, setDoublon] = useState(null);

  useEffect(() => {
    if (!extraction) {
      navigate("/scanner", { replace: true });
    }
  }, [extraction, navigate]);

  if (!extraction) {
    return null;
  }

  const attentionRequise = extraction.confiance !== "haute";
  const fieldClass = `field-input${attentionRequise ? " field-attention" : ""}`;

  const buildPayload = () => ({
    depense: {
      date: form.date,
      fournisseur: form.fournisseur,
      categorie: form.categorie,
      montant_ht: Number(form.montant_ht),
      montant_ttc: Number(form.montant_ttc),
      tva: form.tva
        .filter((t) => t.taux !== "" && t.montant !== "")
        .map((t) => ({ taux: Number(t.taux), montant: Number(t.montant) })),
    },
    fileBase64: prepared?.base64,
    mimeType: prepared?.mimeType,
    fileName: prepared?.fileName,
  });

  const enregistrer = async (forcer) => {
    setEnCours(true);
    setErreur(null);
    try {
      const result = await api.enregistrerDepense({ ...buildPayload(), forcer });
      setDepenseEnregistree(result.depense);
      navigate("/confirmation");
    } catch (err) {
      if (err.status === 409 && err.data?.doublon) {
        setDoublon(err.data.doublon);
      } else {
        setErreur(err.message || "L'enregistrement a échoué.");
      }
    } finally {
      setEnCours(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setDoublon(null);
    enregistrer(false);
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Vérification</h1>
      </header>

      <JustificatifPreview previewUrl={previewUrl} mimeType={prepared?.mimeType} />

      {attentionRequise && (
        <div className="alert alert-warning">
          Confiance {extraction.confiance} sur cette extraction : merci de vérifier attentivement
          chaque champ ci-dessous avant de valider.
        </div>
      )}

      {extraction.avertissement && (
        <div className="alert alert-warning">{extraction.avertissement}</div>
      )}

      <form className="form" onSubmit={onSubmit}>
        <DepenseFieldsForm form={form} updateField={updateField} fieldClass={fieldClass} />

        {doublon && (
          <div className="alert alert-warning doublon-alert">
            <p>
              Un justificatif très proche est déjà enregistré : <strong>{doublon.fournisseur}</strong>,{" "}
              {formatDateFr(doublon.date)}, {formatAmount(doublon.montant_ttc)}.
            </p>
            <div className="doublon-actions">
              <button type="button" className="btn btn-secondary" onClick={() => enregistrer(true)} disabled={enCours}>
                Enregistrer quand même
              </button>
              <button type="button" className="btn btn-link" onClick={() => setDoublon(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {erreur && <div className="alert alert-error">{erreur}</div>}

        {!doublon && (
          <button type="submit" className="btn btn-primary btn-block" disabled={enCours}>
            {enCours ? <Spinner label="Enregistrement..." /> : "Valider"}
          </button>
        )}
      </form>
    </div>
  );
}
