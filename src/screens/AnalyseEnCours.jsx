import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import { api } from "../api/client";
import { prepareFileForUpload } from "../utils/image";
import Spinner from "../components/Spinner";

export default function AnalyseEnCours() {
  const navigate = useNavigate();
  const { file, applyExtraction, setPrepared, reset } = useScan();
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(true);
  const dejaLance = useRef(false);

  const lancerAnalyse = useCallback(async () => {
    setEnCours(true);
    setErreur(null);
    try {
      const { base64, mimeType, fileName } = await prepareFileForUpload(file);
      setPrepared({ base64, mimeType, fileName });
      const extraction = await api.analyserFacture(base64, mimeType);
      applyExtraction(extraction);
      navigate("/verification");
    } catch (err) {
      setErreur(err.message || "L'analyse a échoué.");
    } finally {
      setEnCours(false);
    }
  }, [file, applyExtraction, setPrepared, navigate]);

  useEffect(() => {
    if (!file) {
      navigate("/scanner", { replace: true });
      return;
    }
    if (dejaLance.current) return;
    dejaLance.current = true;
    lancerAnalyse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="screen center-screen">
      {enCours && <Spinner label="Analyse de la facture en cours..." />}

      {!enCours && erreur && (
        <div className="analyse-erreur">
          <div className="alert alert-error">{erreur}</div>
          <button type="button" className="btn btn-primary" onClick={() => { dejaLance.current = true; lancerAnalyse(); }}>
            Réessayer
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              reset();
              navigate("/scanner");
            }}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
