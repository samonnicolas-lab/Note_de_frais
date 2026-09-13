import { CATEGORIES } from "../utils/format";

/**
 * Champs d'une dépense (date, fournisseur, catégorie, montants, TVA), partagés
 * entre l'écran de Vérification (première saisie) et l'écran de Détail/Modification
 * d'une dépense existante. `disabled` bascule le formulaire en lecture seule
 * (dépense exportée et verrouillée).
 */
export default function DepenseFieldsForm({ form, updateField, fieldClass = "field-input", disabled = false }) {
  const updateTva = (index, key, value) => {
    const updated = form.tva.map((t, i) => (i === index ? { ...t, [key]: value } : t));
    updateField("tva", updated);
  };

  const addTva = () => updateField("tva", [...form.tva, { taux: "", montant: "" }]);
  const removeTva = (index) => updateField("tva", form.tva.filter((_, i) => i !== index));

  return (
    <>
      <label className="field">
        <span>Date</span>
        <input
          type="date"
          className={fieldClass}
          value={form.date}
          onChange={(e) => updateField("date", e.target.value)}
          disabled={disabled}
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
          disabled={disabled}
          required
        />
      </label>

      <label className="field">
        <span>Catégorie</span>
        <select
          className={fieldClass}
          value={form.categorie}
          onChange={(e) => updateField("categorie", e.target.value)}
          disabled={disabled}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Description (optionnel)</span>
        <textarea
          className={fieldClass}
          rows={2}
          placeholder="Ex : déjeuner avec un client, mission à Lyon..."
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          disabled={disabled}
        />
      </label>

      {form.categorie === "Invitation client" && (
        <label className="field">
          <span>Personnes invitées</span>
          <textarea
            className={fieldClass}
            rows={2}
            placeholder="Noms des personnes invitées (client, collègues...)"
            value={form.invites}
            onChange={(e) => updateField("invites", e.target.value)}
            disabled={disabled}
          />
        </label>
      )}

      <div className="field-row">
        <label className="field">
          <span>Montant HT</span>
          <input
            type="number"
            step="0.01"
            className={fieldClass}
            value={form.montant_ht}
            onChange={(e) => updateField("montant_ht", e.target.value)}
            disabled={disabled}
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
            disabled={disabled}
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
              disabled={disabled}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Montant"
              className={fieldClass}
              value={t.montant}
              onChange={(e) => updateTva(i, "montant", e.target.value)}
              disabled={disabled}
            />
            {!disabled && (
              <button type="button" className="icon-btn" aria-label="Supprimer ce taux" onClick={() => removeTva(i)}>
                ✕
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button type="button" className="btn btn-link" onClick={addTva}>+ Ajouter un taux de TVA</button>
        )}
      </div>
    </>
  );
}
