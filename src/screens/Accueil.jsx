import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  currentMonth,
  shiftMonth,
  monthLabel,
  formatAmount,
  formatDateFr,
  maxCaracteresDescription,
  tronquerTexte,
} from "../utils/format";
import { useLargeurFenetre } from "../hooks/useLargeurFenetre";

const CLE_AFFICHER_DESCRIPTIONS = "notes-de-frais:afficher-descriptions";

function chargerPreferenceDescriptions() {
  try {
    const valeur = localStorage.getItem(CLE_AFFICHER_DESCRIPTIONS);
    return valeur === null ? true : valeur === "1";
  } catch {
    return true;
  }
}

export default function Accueil() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState(() => {
    const parametre = searchParams.get("mois");
    return parametre && /^\d{4}-\d{2}$/.test(parametre) ? parametre : currentMonth();
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [selection, setSelection] = useState(() => new Set());
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [deverrouillageEnCours, setDeverrouillageEnCours] = useState(false);

  const [afficherDescriptions, setAfficherDescriptions] = useState(chargerPreferenceDescriptions);
  const largeurEcran = useLargeurFenetre();
  const maxCaracteres = maxCaracteresDescription(largeurEcran);

  const onChangerAfficherDescriptions = (valeur) => {
    setAfficherDescriptions(valeur);
    try {
      localStorage.setItem(CLE_AFFICHER_DESCRIPTIONS, valeur ? "1" : "0");
    } catch {
      // Préférence non persistée (stockage indisponible) : sans conséquence, elle repart à sa valeur par défaut.
    }
  };

  const charger = useCallback(async (m) => {
    setLoading(true);
    setErreur(null);
    try {
      const result = await api.listerDepenses(m);
      setData(result);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger(month);
    setSelection(new Set());
  }, [month, charger]);

  const depenses = data?.depenses || [];
  const sorted = [...depenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  const toggleSelection = (id) => {
    setSelection((s) => {
      const copie = new Set(s);
      if (copie.has(id)) copie.delete(id);
      else copie.add(id);
      return copie;
    });
  };

  const annulerSelection = () => setSelection(new Set());

  const tousSelectionnes = sorted.length > 0 && sorted.every((d) => selection.has(d.id));

  const toggleSelectionTout = () => {
    setSelection(tousSelectionnes ? new Set() : new Set(sorted.map((d) => d.id)));
  };

  const deverrouillerSelection = async () => {
    setDeverrouillageEnCours(true);
    setErreur(null);
    try {
      await api.deverrouillerDepenses([...selection]);
      setSelection(new Set());
      await charger(month);
    } catch (err) {
      setErreur(err.message || "Le déverrouillage a échoué.");
    } finally {
      setDeverrouillageEnCours(false);
    }
  };

  const confirmerSuppression = async () => {
    setSuppressionEnCours(true);
    setErreur(null);
    try {
      await api.supprimerDepenses([...selection]);
      setConfirmationOuverte(false);
      setSelection(new Set());
      await charger(month);
    } catch (err) {
      setConfirmationOuverte(false);
      setErreur(err.message || "La suppression a échoué.");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Dépenses</h1>
      </header>

      <div className="month-switcher">
        <button
          type="button"
          className="icon-btn"
          aria-label="Mois précédent"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          ‹
        </button>
        <button
          type="button"
          className="month-label month-label-clickable"
          onClick={() => navigate(`/annee/${month.split("-")[0]}`)}
        >
          {monthLabel(month)}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Mois suivant"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          ›
        </button>
      </div>

      {loading && (
        <div className="center-screen">
          <Spinner label="Chargement des dépenses..." />
        </div>
      )}

      {!loading && erreur && <div className="alert alert-error">{erreur}</div>}

      {!loading && !erreur && (
        <>
          <div className="total-card">
            <span className="text-muted">Total TTC du mois</span>
            <strong className="total-amount">{formatAmount(data?.total_ttc || 0)}</strong>
          </div>

          {sorted.length === 0 ? (
            <div className="empty-state">
              <p>Aucune dépense enregistrée pour ce mois.</p>
              <Link className="btn btn-primary" to="/scanner">Scanner une facture</Link>
            </div>
          ) : (
            <>
              <div className="expense-list-toolbar">
                <label className="select-all-row">
                  <input
                    type="checkbox"
                    className="expense-checkbox"
                    checked={tousSelectionnes}
                    ref={(el) => { if (el) el.indeterminate = selection.size > 0 && !tousSelectionnes; }}
                    onChange={toggleSelectionTout}
                    aria-label="Sélectionner toutes les dépenses du mois"
                  />
                  <span className="text-muted text-small">Tout sélectionner ({sorted.length})</span>
                </label>
                <label className="select-all-row">
                  <input
                    type="checkbox"
                    className="expense-checkbox"
                    checked={afficherDescriptions}
                    onChange={(e) => onChangerAfficherDescriptions(e.target.checked)}
                  />
                  <span className="text-muted text-small">Afficher les descriptions</span>
                </label>
              </div>
              <ul className="expense-list">
              {sorted.map((d) => (
                <li key={d.id} className="expense-item expense-item-selectable">
                  <input
                    type="checkbox"
                    className="expense-checkbox"
                    checked={selection.has(d.id)}
                    onChange={() => toggleSelection(d.id)}
                    aria-label={`Sélectionner la dépense ${d.fournisseur} du ${formatDateFr(d.date)}`}
                  />
                  <div
                    className="expense-item-clickable-zone"
                    onClick={() => navigate(`/depense/${d.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/depense/${d.id}`); }}
                  >
                    <div className="expense-item-main">
                      <span className="expense-fournisseur">{d.fournisseur}</span>
                      <span className="badge">{d.categorie}</span>
                      {d.statut === "exportee" && <span className="badge badge-locked">🔒 Exportée</span>}
                    </div>
                    {afficherDescriptions && d.description && (
                      <div className="expense-item-description">
                        {tronquerTexte(d.description, maxCaracteres)}
                      </div>
                    )}
                    <div className="expense-item-sub">
                      <span className="text-muted">{formatDateFr(d.date)}</span>
                      {d.justificatif_drive_url && (
                        <a
                          href={d.justificatif_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="link-small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Justificatif
                        </a>
                      )}
                    </div>
                  </div>
                  <strong className="expense-amount">{formatAmount(d.montant_ttc)}</strong>
                </li>
              ))}
              </ul>
            </>
          )}
        </>
      )}

      {selection.size > 0 && (
        <div className="selection-bar">
          <span className="selection-bar-count">{selection.size} sélectionnée{selection.size > 1 ? "s" : ""}</span>
          <div className="selection-bar-actions">
            <button type="button" className="btn btn-secondary" onClick={annulerSelection}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={deverrouillerSelection}
              disabled={deverrouillageEnCours}
            >
              {deverrouillageEnCours ? <Spinner label="Déverrouillage..." /> : "Déverrouiller"}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmationOuverte(true)}>
              Supprimer
            </button>
          </div>
        </div>
      )}

      {confirmationOuverte && (
        <ConfirmDialog
          titre="Supprimer la sélection ?"
          message={`${selection.size} dépense${selection.size > 1 ? "s" : ""} et ${selection.size > 1 ? "leurs" : "son"} justificatif${selection.size > 1 ? "s" : ""} seront définitivement supprimés (justificatif mis à la corbeille sur Drive).`}
          confirmLabel="Supprimer"
          enCours={suppressionEnCours}
          onConfirm={confirmerSuppression}
          onCancel={() => setConfirmationOuverte(false)}
        />
      )}
    </div>
  );
}
