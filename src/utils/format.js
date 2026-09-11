export const CATEGORIES = ["Transport", "Repas", "Hébergement", "Fournitures", "Autre"];

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

/** Nom du mois seul, sans l'année (ex. "Janvier"). */
export function monthShortLabel(month) {
  const m = Number(month.split("-")[1]);
  return MONTH_LABELS[m - 1];
}

export function currentYear() {
  return String(new Date().getFullYear());
}

export function formatAmount(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Anthropic facture en dollars : on affiche le coût estimé dans sa devise de
// facturation réelle plutôt que de convertir avec un taux de change fictif.
export function formatUSD(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  });
}

export function formatDateFr(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
