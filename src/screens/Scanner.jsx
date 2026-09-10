import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";

export default function Scanner() {
  const navigate = useNavigate();
  const { startScan } = useScan();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const onFileSelected = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    startScan(file);
    navigate("/analyse");
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Scanner</h1>
      </header>

      <div className="scanner-choices">
        <button type="button" className="scan-choice" onClick={() => cameraInputRef.current?.click()}>
          <span className="scan-choice-icon" aria-hidden="true">📷</span>
          <span className="scan-choice-title">Prendre une photo</span>
          <span className="text-muted text-small">Facture ou ticket de caisse</span>
        </button>

        <button type="button" className="scan-choice" onClick={() => fileInputRef.current?.click()}>
          <span className="scan-choice-icon" aria-hidden="true">📁</span>
          <span className="scan-choice-title">Importer un fichier</span>
          <span className="text-muted text-small">PDF, photo depuis la galerie ou le Drive</span>
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileSelected}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={onFileSelected}
      />
    </div>
  );
}
