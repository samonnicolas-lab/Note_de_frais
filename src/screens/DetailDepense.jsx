import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { prepareFileForUpload } from "../utils/image";
import { formatDateFr } from "../utils/format";
import DepenseFieldsForm from "../components/DepenseFieldsForm";
import JustificatifPreview from "../components/JustificatifPreview";
import ConfirmDialog from "../components/ConfirmDialog";
import Spinner from "../components/Spinner";

const EMPTY_FORM = { date: "", fournisseur: "", categorie: "Autre", montant_ht: "", montant_ttc: "", tva: [] };

function depenseVersForm(depense) {
  return {
    date: depense.date || "",
    fournisseur: depense.fournisseur || "",
    categorie: depense.categorie || "Autre",
    montant_ht: depense.montant_ht ?? "",
    montant_ttc: depense.montant_ttc ?? "",
    tva: Array.isArray(depense.tva) ? depense.tva : [],
  };
}

export default function DetailDepense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [depense, setDepense] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [nouveauFichier, setNouveauFichier] = useState(null); // { base64, mimeType, fileName, previewUrl }
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    api
      .obtenirDepense(id)
      .then((data) => {
        if (annule) return;
        setDepense(data.depense);
        setForm(depenseVersForm(data.depense));
      })
      .catch((err) => { if (!annule) setErreurChargement(err.message); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [id]);

  useEffect(() => {
    return () => {
      if (nouveauFichier?.previewUrl) URL.revokeObjectURL(nouveauFichier.previewUrl);
    };
  }, [nouveauFichier]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const verrouillee = depense?.statut === "exportee";

  const onChoisirFichier = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const { base64, mimeType, fileName } = await prepareFileForUpload(file);
    const previewUrl = URL.createObjectURL(file);
    setNouveauFichier((old) => {
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return { base64, mimeType, fileName, previewUrl };
    });
  };

  const enregistrer = async (event) => {
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
        fileBase64: nouveauFichier?.base64,
        mimeType: nouveauFichier?.mimeType,
        fileName: nouveauFichier?.fileName,
      };
      const result = await api.modifierDepense(id, payload);
      setDepense(result.depense);
      setForm(depenseVersForm(result.depense));
      setNouveauFichier(null);
      navigate("/");
    } catch (err) {
      setErreur(err.message || "La modification a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const deverrouiller = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      const result = await api.deverrouillerDepense(id);
      setDepense(result.depense);
    } catch (err) {
      setErreur(err.message || "Le déverrouillage a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const confirmerSuppression = async () => {
    setSuppressionEnCours(true);
    setErreur(null);
    try {
      await api.supprimerDepenses([id]);
      navigate("/");
    } catch (err) {
      setConfirmationOuverte(false);
      setErreur(err.message || "La suppression a échoué.");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  if (chargement) {
    return (
      <div className="screen center-screen">
        <Spinner label="Chargement de la dépense..." />
      </div>
    );
  }

  if (erreurChargement || !depense) {
    return (
      <div className="screen">
        <div className="alert alert-error">{erreurChargement || "Dépense introuvable."}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>Retour</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Détail de la dépense</h1>
      </header>

      {verrouillee && (
        <div className="alert alert-warning">
          <p>Cette dépense a été incluse dans un export mensuel : elle est verrouillée.</p>
          <button type="button" className="btn btn-secondary" onClick={deverrouiller} disabled={enCours}>
            {enCours ? <Spinner label="Déverrouillage..." /> : "Déverrouiller pour modifier"}
          </button>
        </div>
      )}

      <JustificatifPreview
        previewUrl={nouveauFichier?.previewUrl}
        mimeType={nouveauFichier?.mimeType}
        driveUrl={depense.justificatif_drive_url}
      />

      {!verrouillee && (
        <label className="field">
          <span>Remplacer le justificatif (optionnel)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="field-input"
            onChange={onChoisirFichier}
          />
        </label>
      )}

      <form className="form" onSubmit={enregistrer}>
        <DepenseFieldsForm form={form} updateField={updateField} disabled={verrouillee} />

        {erreur && <div className="alert alert-error">{erreur}</div>}

        {!verrouillee && (
          <button type="submit" className="btn btn-primary btn-block" disabled={enCours}>
            {enCours ? <Spinner label="Enregistrement..." /> : "Enregistrer les modifications"}
          </button>
        )}
        {!verrouillee && (
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => setConfirmationOuverte(true)}
            disabled={enCours}
          >
            Supprimer cette dépense
          </button>
        )}

        <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate("/")}>
          Retour aux dépenses
        </button>
      </form>

      {confirmationOuverte && (
        <ConfirmDialog
          titre="Supprimer cette dépense ?"
          message={`${depense.fournisseur} du ${formatDateFr(depense.date)} sera définitivement supprimée, justificatif compris (mis à la corbeille sur Drive).`}
          confirmLabel="Supprimer"
          enCours={suppressionEnCours}
          onConfirm={confirmerSuppression}
          onCancel={() => setConfirmationOuverte(false)}
        />
      )}
    </div>
  );
}
