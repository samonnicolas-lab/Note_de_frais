import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { currentMonth, monthLabel, shiftMonth } from "../utils/format";
import Spinner from "../components/Spinner";

export default function Export() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [statutModele, setStatutModele] = useState(null); // { configure, config }
  const [apercuImage, setApercuImage] = useState(null);
  const [chargementApercu, setChargementApercu] = useState(true);
  const [erreurApercu, setErreurApercu] = useState(null);

  useEffect(() => {
    let annule = false;
    api
      .obtenirModeleExcel()
      .then((data) => { if (!annule) setStatutModele(data); })
      .catch(() => { if (!annule) setStatutModele(null); });
    return () => { annule = true; };
  }, []);

  useEffect(() => {
    let annule = false;
    setChargementApercu(true);
    setErreurApercu(null);
    api
      .apercuExport(month)
      .then((data) => { if (!annule) setApercuImage(data.image); })
      .catch((err) => { if (!annule) setErreurApercu(err.message || "L'aperçu n'a pas pu être généré."); })
      .finally(() => { if (!annule) setChargementApercu(false); });
    return () => { annule = true; };
  }, [month]);

  const modeleConfigure = statutModele?.configure;
  const allerAuModele = () => navigate("/modele-excel");

  const genererExport = async () => {
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      const data = await api.exporterMensuel(month);
      setResultat(data);
    } catch (err) {
      setErreur(err.message || "L'export a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Export mensuel</h1>
      </header>

      <div className="month-switcher">
        <button
          type="button"
          className="icon-btn"
          aria-label="Mois précédent"
          onClick={() => { setMonth((m) => shiftMonth(m, -1)); setResultat(null); }}
        >
          ‹
        </button>
        <span className="month-label">{monthLabel(month)}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Mois suivant"
          onClick={() => { setMonth((m) => shiftMonth(m, 1)); setResultat(null); }}
        >
          ›
        </button>
      </div>

      <p className="text-muted">
        Génère un fichier Excel (.xlsx) des dépenses du mois sélectionné et l'archive automatiquement
        sur votre Drive, dans le dossier « Notes de frais/{month}/ ».
      </p>

      {statutModele && (
        <div
          className="modele-apercu"
          role="button"
          tabIndex={0}
          onClick={allerAuModele}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              allerAuModele();
            }
          }}
        >
          <span className="text-muted text-small">
            {modeleConfigure ? "Modèle utilisé" : "Aucun modèle personnalisé"}
          </span>
          <strong>{modeleConfigure ? statutModele.config.fileName : "Export standard de l'application"}</strong>

          <div className="export-preview">
            {chargementApercu && <Spinner label="Génération de l'aperçu..." />}
            {!chargementApercu && erreurApercu && <span className="text-muted text-small">{erreurApercu}</span>}
            {!chargementApercu && apercuImage && (
              <img src={apercuImage} alt="Aperçu avant impression de l'export" className="export-preview-image" />
            )}
          </div>
          <span className="text-muted text-small">Aperçu avec des valeurs d'exemple.</span>
          <span className="text-muted text-small">Cliquez pour changer le modèle d'export</span>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={genererExport} disabled={enCours}>
        {enCours ? <Spinner label="Génération en cours..." /> : "Générer l'export"}
      </button>

      {erreur && <div className="alert alert-error">{erreur}</div>}

      {resultat && (
        <div className="alert alert-success">
          <p>Export généré : {resultat.nombre_depenses} dépense(s).</p>
          <a href={resultat.fichier.url} target="_blank" rel="noreferrer" className="link-small">
            Ouvrir {resultat.fichier.nom} sur Drive
          </a>
        </div>
      )}
    </div>
  );
}
