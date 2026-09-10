import { useState } from "react";
import { api } from "../api/client";
import { currentMonth, monthLabel, shiftMonth } from "../utils/format";
import Spinner from "../components/Spinner";

export default function Export() {
  const [month, setMonth] = useState(currentMonth());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);

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
