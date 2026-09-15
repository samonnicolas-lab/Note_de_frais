import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { currentMonth, monthLabel, shiftMonth } from "../utils/format";
import { CHAMPS_EXPORT_STANDARD, champsModelePersonnalise, valeurColonne } from "../utils/exportColumns";
import Spinner from "../components/Spinner";

const LIGNES_APERCU_MAX = 15;

export default function Export() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [statutModele, setStatutModele] = useState(null); // { configure, config }
  const [depenses, setDepenses] = useState(null); // null tant que non chargé

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
    setDepenses(null);
    api
      .listerDepenses(month)
      .then((data) => { if (!annule) setDepenses(data.depenses || []); })
      .catch(() => { if (!annule) setDepenses([]); });
    return () => { annule = true; };
  }, [month]);

  const modeleConfigure = statutModele?.configure;
  const champsApercu = modeleConfigure
    ? champsModelePersonnalise(statutModele.config.mapping)
    : CHAMPS_EXPORT_STANDARD;
  const lignesApercu = (depenses || []).slice(0, LIGNES_APERCU_MAX);
  const lignesRestantes = Math.max(0, (depenses || []).length - LIGNES_APERCU_MAX);

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
            <table className="export-preview-table">
              <thead>
                <tr>
                  {champsApercu.map((c) => <th key={c.cle}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {depenses === null && (
                  <tr>
                    <td className="export-preview-vide" colSpan={champsApercu.length}>Chargement de l'aperçu...</td>
                  </tr>
                )}
                {depenses !== null && lignesApercu.length === 0 && (
                  <tr>
                    <td className="export-preview-vide" colSpan={champsApercu.length}>
                      Aucune dépense pour {monthLabel(month)}
                    </td>
                  </tr>
                )}
                {lignesApercu.map((d) => (
                  <tr key={d.id}>
                    {champsApercu.map((c) => <td key={c.cle}>{valeurColonne(d, c.cle) || "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lignesRestantes > 0 && (
            <span className="text-muted text-small">
              + {lignesRestantes} autre{lignesRestantes > 1 ? "s" : ""} ligne{lignesRestantes > 1 ? "s" : ""} non affichée{lignesRestantes > 1 ? "s" : ""}
            </span>
          )}
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
