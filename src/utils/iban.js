// Validation IBAN au format international (ISO 13616) : structure générale
// + clé de contrôle MOD-97 (ISO 7064), le même algorithme que celui utilisé
// par les banques pour détecter une faute de frappe.
const FORMAT_GENERAL = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export function nettoyerIban(iban) {
  return (iban || "").replace(/\s+/g, "").toUpperCase();
}

export function ibanEstValide(iban) {
  const nettoye = nettoyerIban(iban);
  if (!FORMAT_GENERAL.test(nettoye)) return false;

  // Déplace les 4 premiers caractères à la fin, convertit chaque lettre en
  // nombre (A=10, ..., Z=35), puis calcule le reste modulo 97 : doit valoir 1.
  const reordonne = nettoye.slice(4) + nettoye.slice(0, 4);
  const numerique = reordonne.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let reste = 0;
  for (const chiffre of numerique) {
    reste = (reste * 10 + Number(chiffre)) % 97;
  }
  return reste === 1;
}

/** Formatage lisible par blocs de 4 caractères (affichage uniquement). */
export function formaterIban(iban) {
  const nettoye = nettoyerIban(iban);
  return nettoye.replace(/(.{4})/g, "$1 ").trim();
}
