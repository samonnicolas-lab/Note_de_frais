import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { currentMonth, monthLabel, shiftMonth } from "../utils/format";
import {
  CHAMPS_EXPORT_STANDARD,
  CHAMPS_ENTETE,
  champsModelePersonnalise,
  valeurColonne,
  valeurEntete,
  depensesExemple,
} from "../utils/exportColumns";
import Spinner from "../components/Spinner";

export default function Export() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [statutModele, setStatutModele] = useState(null); // { configure, config }
  const [profil, setProfil] = useState({ nom: "", fonction: "", iban: "" });

  useEffect(() => {
    let annule = false;
    api
      .obtenirModeleExcel()
      .then((data) => { if (!annule) setStatutModele(data); })
      .catch(() => { if (!annule) setStatutModele(null); });
    api
      .obtenirProfil()
      .then((data) => { if (!annule) setProfil(data.profil); })
      .catch(() => {});
    return () => { annule = true; };
  }, []);

  const modeleConfigure = statutModele?.configure;
  const champsApercu = modeleConfigure
    ? champsModelePersonnalise(statutModele.config.mapping)
    : CHAMPS_EXPORT_STANDARD;
  const lignesExemple = depensesExemple(month);
  const nbColonnes = champsApercu.length;

  // Modèle personnalisé : positions arbitraires dans le fichier de l'utilisateur,
  // on ne peut pas reconstituer sa mise en page exacte — on liste juste les
  // informations d'en-tête réellement configurées, avec leur valeur.
  const champsEnteteConfigures = modeleConfigure
    ? CHAMPS_ENTETE.filter((c) => statutModele.config.cellules?.[c.cle])
    : [];

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

          {champsEnteteConfigures.length > 0 && (
            <p className="text-muted text-small">
              En-tête du modèle :{" "}
              {champsEnteteConfigures
                .map((c) => `${c.label} : ${valeurEntete(c.cle, month, profil) || "(vide)"}`)
                .join(" · ")}
            </p>
          )}

          <div className="export-preview">
            <table className="export-preview-table">
              {!modeleConfigure && (
                <thead className="export-preview-entete">
                  <tr>
                    <th colSpan={nbColonnes} className="export-preview-titre">NOTE DE FRAIS</th>
                  </tr>
                  <tr>
                    <td colSpan={Math.ceil(nbColonnes / 2)}>Nom : {profil.nom || "—"}</td>
                    <td colSpan={Math.floor(nbColonnes / 2)}>Fonction : {profil.fonction || "—"}</td>
                  </tr>
                  <tr>
                    <td colSpan={Math.ceil(nbColonnes / 2)}>Mois : {monthLabel(month)}</td>
                    <td colSpan={Math.floor(nbColonnes / 2)}>IBAN : {profil.iban || "—"}</td>
                  </tr>
                </thead>
              )}
              <thead>
                <tr>
                  {champsApercu.map((c) => <th key={c.cle}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {lignesExemple.map((d, i) => (
                  <tr key={i}>
                    {champsApercu.map((c) => <td key={c.cle}>{valeurColonne(d, c.cle) || "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
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
