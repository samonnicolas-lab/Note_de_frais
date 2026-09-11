import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { prepareFileForUpload } from "../utils/image";
import Spinner from "../components/Spinner";

const CHAMPS = [
  { cle: "date", label: "Date" },
  { cle: "fournisseur", label: "Fournisseur" },
  { cle: "categorie", label: "Catégorie" },
  { cle: "montant_ht", label: "Montant HT" },
  { cle: "tva", label: "TVA" },
  { cle: "montant_ttc", label: "Montant TTC" },
  { cle: "lien_justificatif", label: "Lien justificatif Drive" },
];

// Informations d'en-tête : une seule cellule chacune (pas répétées par ligne).
const CHAMPS_CELLULES = [
  { cle: "nom", label: "Nom" },
  { cle: "fonction", label: "Fonction" },
  { cle: "mois", label: "Mois de référence" },
  { cle: "iban", label: "N° IBAN" },
  { cle: "total_tva", label: "Total TVA" },
];

const CELLULES_VIDES = { nom: "", fonction: "", mois: "", iban: "", total_tva: "" };
const REFERENCE_CELLULE = /^[A-Za-z]{1,3}\d+$/;

const MOTS_CLES = {
  date: /date/i,
  fournisseur: /fournisseur|b[ée]n[ée]ficiaire|nom|soci[ée]t[ée]|entreprise|payeur/i,
  categorie: /cat[ée]gorie|nature|type/i,
  montant_ht: /\bht\b|hors.?taxe/i,
  tva: /tva/i,
  montant_ttc: /ttc|total/i,
  lien_justificatif: /justificatif|pi[èe]ce|lien|drive|url/i,
};

function suggererMapping(colonnes) {
  const mapping = {};
  for (const champ of Object.keys(MOTS_CLES)) {
    const trouve = colonnes.find((c) => MOTS_CLES[champ].test(c.valeur));
    mapping[champ] = trouve ? trouve.colonne : "";
  }
  return mapping;
}

function apercuLigne(ligne) {
  return ligne.cellules.map((c) => c.valeur).join(" | ").slice(0, 70) || "(ligne vide)";
}

function extraireColonnes(liste, numero) {
  const ligne = liste.find((l) => l.numero === numero);
  return ligne ? ligne.cellules : [];
}

export default function ModeleExcel() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [chargement, setChargement] = useState(true);
  const [statut, setStatut] = useState(null); // { configure, config }
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Étape "mapping" : présente uniquement après import d'un nouveau fichier.
  const [etape, setEtape] = useState("statut"); // 'statut' | 'mapping'
  const [fileBase64, setFileBase64] = useState(null);
  const [fileName, setFileName] = useState("");
  const [apercu, setApercu] = useState([]);
  const [ligneEntete, setLigneEntete] = useState(1);
  const [mapping, setMapping] = useState({});
  const [cellules, setCellules] = useState(CELLULES_VIDES);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const data = await api.obtenirModeleExcel();
      setStatut(data);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const colonnesDeLaLigne = (numero) => extraireColonnes(apercu, numero);

  const onChoisirFichier = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setEnCours(true);
    setErreur(null);
    try {
      const { base64 } = await prepareFileForUpload(file);
      const analyse = await api.analyserModeleExcel(base64);
      setFileBase64(base64);
      setFileName(file.name);
      setApercu(analyse.apercu);
      setLigneEntete(analyse.ligneEnteteSuggeree);
      setMapping(suggererMapping(extraireColonnes(analyse.apercu, analyse.ligneEnteteSuggeree)));
      setCellules(CELLULES_VIDES);
      setEtape("mapping");
    } catch (err) {
      setErreur(err.message || "L'analyse du fichier a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const onChangerLigneEntete = (numero) => {
    setLigneEntete(numero);
    setMapping(suggererMapping(colonnesDeLaLigne(numero)));
  };

  const onEnregistrer = async () => {
    for (const champ of CHAMPS_CELLULES) {
      const valeur = cellules[champ.cle].trim();
      if (valeur && !REFERENCE_CELLULE.test(valeur)) {
        setErreur(`Référence de cellule invalide pour "${champ.label}" : ${valeur} (exemple attendu : B2).`);
        return;
      }
    }
    setEnCours(true);
    setErreur(null);
    try {
      const data = await api.enregistrerModeleExcel({
        fileBase64,
        fileName,
        ligneEntete,
        mapping,
        cellules,
      });
      setStatut({ configure: true, config: data.config });
      setEtape("statut");
    } catch (err) {
      setErreur(err.message || "L'enregistrement du modèle a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const onSupprimer = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      await api.supprimerModeleExcel();
      await charger();
    } catch (err) {
      setErreur(err.message || "La suppression a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <div className="screen center-screen">
        <Spinner label="Chargement..." />
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Modèle Excel</h1>
      </header>

      <p className="text-muted">
        Importez le modèle Excel vierge de votre entreprise pour que les exports mensuels
        respectent exactement sa mise en forme, au lieu des colonnes fixes par défaut.
      </p>

      {erreur && <div className="alert alert-error">{erreur}</div>}

      {etape === "statut" && (
        <>
          {statut?.configure ? (
            <div className="settings-card">
              <span className="text-muted">Modèle actuellement configuré</span>
              <strong>{statut.config.fileName}</strong>
              <span className="text-muted text-small">
                Ligne d'en-tête : {statut.config.ligneEntete} — colonnes associées :{" "}
                {CHAMPS.filter((c) => statut.config.mapping[c.cle]).map((c) => c.label).join(", ") || "aucune"}
              </span>
              {statut.config.cellules && Object.values(statut.config.cellules).some(Boolean) && (
                <span className="text-muted text-small">
                  Informations d'en-tête :{" "}
                  {CHAMPS_CELLULES.filter((c) => statut.config.cellules[c.cle]).map((c) => c.label).join(", ")}
                </span>
              )}
            </div>
          ) : (
            <div className="settings-card">
              <span className="text-muted">Aucun modèle personnalisé configuré</span>
              <span className="text-small">Les exports utilisent actuellement la structure à colonnes fixes.</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => fileInputRef.current?.click()}
            disabled={enCours}
          >
            {enCours ? <Spinner label="Analyse en cours..." /> : (statut?.configure ? "Changer de modèle" : "Importer un modèle Excel")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={onChoisirFichier}
          />

          {statut?.configure && (
            <button type="button" className="btn btn-secondary btn-block" onClick={onSupprimer} disabled={enCours}>
              Revenir à l'export standard
            </button>
          )}

          <button type="button" className="btn btn-link" onClick={() => navigate("/reglages")}>
            Retour aux réglages
          </button>
        </>
      )}

      {etape === "mapping" && (
        <>
          <div className="settings-card">
            <span className="text-muted">Fichier importé</span>
            <strong>{fileName}</strong>
          </div>

          <label className="field">
            <span>Ligne d'en-tête (contenant les noms de colonnes)</span>
            <select
              className="field-input"
              value={ligneEntete}
              onChange={(e) => onChangerLigneEntete(Number(e.target.value))}
            >
              {apercu.map((l) => (
                <option key={l.numero} value={l.numero}>
                  Ligne {l.numero} — {apercuLigne(l)}
                </option>
              ))}
            </select>
          </label>

          <div className="form">
            {CHAMPS.map((champ) => (
              <label className="field" key={champ.cle}>
                <span>{champ.label}</span>
                <select
                  className="field-input"
                  value={mapping[champ.cle] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [champ.cle]: e.target.value }))}
                >
                  <option value="">Aucune correspondance</option>
                  {colonnesDeLaLigne(ligneEntete).map((c) => (
                    <option key={c.colonne} value={c.colonne}>
                      Colonne {c.colonne} — {c.valeur}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="settings-card">
            <span className="text-muted">Informations d'en-tête (optionnel)</span>
            <p className="text-small text-muted">
              Indiquez la cellule de votre modèle où écrire chaque information, par exemple{" "}
              <code>B2</code>. Laissez vide si votre modèle ne la prévoit pas.
            </p>
            <div className="form">
              {CHAMPS_CELLULES.map((champ) => (
                <label className="field" key={champ.cle}>
                  <span>{champ.label}</span>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="ex. B2"
                    value={cellules[champ.cle]}
                    onChange={(e) => setCellules((c) => ({ ...c, [champ.cle]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {(cellules.nom || cellules.fonction || cellules.iban) && (
              <p className="text-small text-muted">
                Nom, fonction et IBAN sont ceux renseignés dans Réglages → Informations personnelles.
              </p>
            )}
          </div>

          {erreur && <div className="alert alert-error">{erreur}</div>}

          <button type="button" className="btn btn-primary btn-block" onClick={onEnregistrer} disabled={enCours}>
            {enCours ? <Spinner label="Enregistrement..." /> : "Enregistrer ce modèle"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => { setEtape("statut"); setErreur(null); }}
            disabled={enCours}
          >
            Annuler
          </button>
        </>
      )}
    </div>
  );
}
