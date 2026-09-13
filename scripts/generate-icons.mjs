// Génère les icônes PWA (note de frais : facture + pastille euro) avec
// @napi-rs/canvas (déjà une dépendance du projet pour l'OCR/Phase 3).
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dessinerIcone(size, { maskable = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Fond bleu (coins arrondis pour les icônes non-maskable ; carré plein pour
  // les maskable, dont le système applique lui-même le masque/l'arrondi).
  const rayonFond = maskable ? 0 : size * 0.22;
  const degrade = ctx.createLinearGradient(0, 0, size, size);
  degrade.addColorStop(0, "#2f6fed");
  degrade.addColorStop(1, "#1650c9");
  ctx.fillStyle = degrade;
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    roundRect(ctx, 0, 0, size, size, rayonFond);
    ctx.fill();
  }

  // Le contenu (facture + pastille) doit rester dans la zone sûre pour le maskable.
  const echelle = maskable ? 0.72 : 1;
  const decalage = (size * (1 - echelle)) / 2;
  ctx.translate(decalage, decalage);
  const s = size * echelle;

  // Feuille de facture, coin supérieur droit replié, bas en dents de scie.
  const px0 = s * 0.24;
  const py0 = s * 0.24;
  const largeur = s * 0.44;
  const hauteur = s * 0.58;
  const pli = s * 0.09;
  const dents = 5;
  const dentH = s * 0.045;

  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px0 + largeur - pli, py0);
  ctx.lineTo(px0 + largeur, py0 + pli);
  ctx.lineTo(px0 + largeur, py0 + hauteur - dentH);
  for (let i = 0; i < dents; i++) {
    const xBase = px0 + largeur - (largeur / dents) * i;
    const xMid = xBase - largeur / dents / 2;
    ctx.lineTo(xMid, py0 + hauteur);
    ctx.lineTo(xBase - largeur / dents, py0 + hauteur - dentH);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Coin replié (triangle bleu clair).
  ctx.beginPath();
  ctx.moveTo(px0 + largeur - pli, py0);
  ctx.lineTo(px0 + largeur, py0 + pli);
  ctx.lineTo(px0 + largeur - pli, py0 + pli);
  ctx.closePath();
  ctx.fillStyle = "#c7dbfb";
  ctx.fill();

  // Lignes de texte + symboles €.
  const nbLignes = 4;
  const ligneH = Math.max(2, s * 0.028);
  const ligneLargeur = largeur * 0.56;
  const ligneX = px0 + largeur * 0.1;
  ctx.font = `700 ${Math.round(s * 0.09)}px sans-serif`;
  ctx.fillStyle = "#33507a";
  ctx.textBaseline = "middle";
  for (let i = 0; i < nbLignes; i++) {
    const ligneY = py0 + hauteur * (0.22 + i * 0.175);
    const w = i === nbLignes - 1 ? ligneLargeur * 0.55 : ligneLargeur;
    roundRect(ctx, ligneX, ligneY, w, ligneH, ligneH / 2);
    ctx.fillStyle = "#7e93bd";
    ctx.fill();
    if (i < nbLignes - 1) {
      ctx.fillStyle = "#33507a";
      ctx.fillText("€", ligneX + ligneLargeur + s * 0.03, ligneY + ligneH / 2);
    }
  }

  // Pastille verte avec grand €, chevauchant le coin bas-droit de la feuille.
  const rPastille = s * 0.24;
  const cx = px0 + largeur * 0.92;
  const cy = py0 + hauteur * 0.96;
  ctx.beginPath();
  ctx.arc(cx, cy, rPastille, 0, Math.PI * 2);
  ctx.fillStyle = "#1fa15c";
  ctx.fill();
  ctx.font = `700 ${Math.round(rPastille * 1.5)}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("€", cx, cy + rPastille * 0.06);

  return canvas.toBuffer("image/png");
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", dessinerIcone(192));
writeFileSync("public/icons/icon-512.png", dessinerIcone(512));
writeFileSync("public/icons/icon-maskable-192.png", dessinerIcone(192, { maskable: true }));
writeFileSync("public/icons/icon-maskable-512.png", dessinerIcone(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", dessinerIcone(180, { maskable: true }));
console.log("Icônes générées dans public/icons/");
