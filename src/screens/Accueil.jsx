import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { currentMonth, shiftMonth, monthLabel, formatAmount, formatDateFr } from "../utils/format";

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
  }, [month, charger]);

  const depenses = data?.depenses || [];
  const sorted = [...depenses].sort((a, b) => (a.date < b.date ? 1 : -1));

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
            <ul className="expense-list">
              {sorted.map((d) => (
                <li
                  key={d.id}
                  className="expense-item expense-item-clickable"
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
                  <strong className="expense-amount">{formatAmount(d.montant_ttc)}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
