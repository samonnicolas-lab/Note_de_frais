import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { currentMonth, formatAmount, monthShortLabel } from "../utils/format";

export default function VueAnnuelle() {
  const { year } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async (y) => {
    setLoading(true);
    setErreur(null);
    try {
      const result = await api.listerDepensesAnnee(y);
      setData(result);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger(year);
  }, [year, charger]);

  const moisActuel = currentMonth();
  const anneeActuelle = String(new Date().getFullYear());

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Vue annuelle</h1>
      </header>

      <div className="month-switcher">
        <button
          type="button"
          className="icon-btn"
          aria-label="Année précédente"
          onClick={() => navigate(`/annee/${Number(year) - 1}`)}
        >
          ‹
        </button>
        <span className="month-label">{year}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Année suivante"
          onClick={() => navigate(`/annee/${Number(year) + 1}`)}
        >
          ›
        </button>
      </div>

      {loading && (
        <div className="center-screen">
          <Spinner label="Chargement de l'année..." />
        </div>
      )}

      {!loading && erreur && <div className="alert alert-error">{erreur}</div>}

      {!loading && !erreur && data && (
        <>
          <div className="total-card">
            <span className="text-muted">Total TTC de l'année</span>
            <strong className="total-amount">{formatAmount(data.total_ttc)}</strong>
            <span className="text-muted text-small">{data.nombre_depenses} dépense(s) sur l'année</span>
          </div>

          <div className="year-grid">
            {data.mois.map((m) => {
              const estMoisActuel = year === anneeActuelle && m.month === moisActuel;
              const vide = m.nombre_depenses === 0;
              return (
                <button
                  type="button"
                  key={m.month}
                  className={`year-tile${vide ? " year-tile-vide" : ""}${estMoisActuel ? " year-tile-actuel" : ""}`}
                  onClick={() => navigate(`/?mois=${m.month}`)}
                >
                  <span className="year-tile-mois">{monthShortLabel(m.month)}</span>
                  <strong className="year-tile-montant">{formatAmount(m.total_ttc)}</strong>
                  <span className="year-tile-nombre text-muted text-small">
                    {m.nombre_depenses} dépense{m.nombre_depenses > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
