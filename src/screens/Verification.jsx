import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import { api } from "../api/client";
import { CATEGORIES } from "../utils/format";
import Spinner from "../components/Spinner";

export default function Verification() {
  const navigate = useNavigate();
  const { extraction, form, updateField, previewUrl, prepared, setDepenseEnregistree } = useScan();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  if (!extraction) {
    navigate("/scanner", { replace: true });
    return null;
  }

  const attentionRequise = extraction.confiance !== "haute";
  const fieldClass = `field-input${attentionRequise ? " field-attention" : ""}`;

  const updateTva = (index, key, value) => {
    const updated = form.tva.map((t, i) => (i === index ? { ...t, [key]: value } : t));
    updateField("tva", updated);
  };

  const addTva = () => updateField("tva", [...form.tva, { taux: "", montant: "" }]);
  const removeTva = (index) => updateField("tva", form.tva.filter((_, i) => i !== index));

  const onSubmit = async (event) => {
    event.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const payload = {
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
      };
      const result = await api.enregistrerDepense(payload);
      setDepenseEnregistree(result.depense);
      navigate("/confirmation");
    } catch (err) {
      setErreur(err.message || "L'enregistrement a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Vérification</h1>
      </header>

      {previewUrl && (
        <div className="justificatif-preview">
          {prepared?.mimeType === "application/pdf" ? (
            <div className="pdf-placeholder">📄 Document PDF</div>
          ) : (
            <img src={previewUrl} alt="Aperçu du justificatif" />
          )}
        </div>
      )}

      {attentionRequise && (
        <div className="alert alert-warning">
          Confiance {extraction.confiance} sur cette extraction : merci de vérifier attentivement
          chaque champ ci-dessous avant de valider.
        </div>
      )}

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            className={fieldClass}
            value={form.date}
            onChange={(e) => updateField("date", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Fournisseur</span>
          <input
            type="text"
            className={fieldClass}
            value={form.fournisseur}
            onChange={(e) => updateField("fournisseur", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Catégorie</span>
          <select
            className={fieldClass}
            value={form.categorie}
            onChange={(e) => updateField("categorie", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Montant HT</span>
            <input
              type="number"
              step="0.01"
              className={fieldClass}
              value={form.montant_ht}
              onChange={(e) => updateField("montant_ht", e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Montant TTC</span>
            <input
              type="number"
              step="0.01"
              className={fieldClass}
              value={form.montant_ttc}
              onChange={(e) => updateField("montant_ttc", e.target.value)}
              required
            />
          </label>
        </div>

        <div className="tva-section">
          <span className="field-label">TVA</span>
          {form.tva.map((t, i) => (
            <div className="tva-row" key={i}>
              <input
                type="number"
                step="0.01"
                placeholder="Taux %"
                className={fieldClass}
                value={t.taux}
                onChange={(e) => updateTva(i, "taux", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Montant"
                className={fieldClass}
                value={t.montant}
                onChange={(e) => updateTva(i, "montant", e.target.value)}
              />
              <button type="button" className="icon-btn" aria-label="Supprimer ce taux" onClick={() => removeTva(i)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-link" onClick={addTva}>+ Ajouter un taux de TVA</button>
        </div>

        {erreur && <div className="alert alert-error">{erreur}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={enCours}>
          {enCours ? <Spinner label="Enregistrement..." /> : "Valider"}
        </button>
      </form>
    </div>
  );
}
