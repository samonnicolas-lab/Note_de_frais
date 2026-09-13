import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CATEGORIES } from "../utils/format";

const ScanContext = createContext(null);

const EMPTY_FORM = {
  date: "",
  fournisseur: "",
  categorie: CATEGORIES[CATEGORIES.length - 1],
  description: "",
  invites: "",
  montant_ht: "",
  montant_ttc: "",
  tva: [],
};

export function ScanProvider({ children }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [depenseEnregistree, setDepenseEnregistree] = useState(null);
  const [driveStatus, setDriveStatus] = useState("idle"); // idle | ok | erreur
  const [prepared, setPrepared] = useState(null); // { base64, mimeType, fileName }

  const startScan = useCallback((selectedFile) => {
    setFile(selectedFile);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(selectedFile);
    });
    setExtraction(null);
    setDepenseEnregistree(null);
    setDriveStatus("idle");
    setPrepared(null);
  }, []);

  const applyExtraction = useCallback((data) => {
    setExtraction(data);
    setForm({
      date: data.date || "",
      fournisseur: data.fournisseur || "",
      categorie: CATEGORIES.includes(data.categorie) ? data.categorie : "Autre",
      description: data.description || "",
      invites: data.invites || "",
      montant_ht: data.montant_ht ?? "",
      montant_ttc: data.montant_ttc ?? "",
      tva: Array.isArray(data.tva) ? data.tva : [],
    });
  }, []);

  const updateField = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setFile(null);
    setExtraction(null);
    setForm(EMPTY_FORM);
    setDepenseEnregistree(null);
    setDriveStatus("idle");
    setPrepared(null);
  }, []);

  const value = useMemo(
    () => ({
      file,
      previewUrl,
      extraction,
      form,
      updateField,
      depenseEnregistree,
      setDepenseEnregistree,
      driveStatus,
      setDriveStatus,
      prepared,
      setPrepared,
      startScan,
      applyExtraction,
      reset,
    }),
    [
      file,
      previewUrl,
      extraction,
      form,
      updateField,
      depenseEnregistree,
      driveStatus,
      prepared,
      startScan,
      applyExtraction,
      reset,
    ]
  );

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan doit être utilisé à l'intérieur de <ScanProvider>.");
  return ctx;
}
