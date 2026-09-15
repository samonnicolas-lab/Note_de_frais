import { useEffect, useState } from "react";

/** Largeur de la fenêtre, mise à jour (avec un léger anti-rebond) au redimensionnement. */
export function useLargeurFenetre() {
  const [largeur, setLargeur] = useState(window.innerWidth);

  useEffect(() => {
    let delai = null;
    const onResize = () => {
      clearTimeout(delai);
      delai = setTimeout(() => setLargeur(window.innerWidth), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(delai);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return largeur;
}
