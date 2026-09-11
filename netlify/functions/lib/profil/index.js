// Profil personnel de l'utilisateur (nom, fonction, IBAN) : des informations
// d'en-tête à écrire une fois par export dans le modèle Excel, configurées une
// seule fois par l'utilisateur plutôt que ressaisies à chaque note de frais.
import { readJsonFile, writeJsonFile, readJsonFileIfExists } from "../drive/driveClient.js";

const PROFIL_FILENAME = "profil.json";

export async function getProfil(drive) {
  const found = await readJsonFileIfExists(drive, PROFIL_FILENAME);
  return found ? found.data : { nom: "", fonction: "", iban: "" };
}

export async function saveProfil(drive, { nom, fonction, iban }) {
  const profil = { nom: nom || "", fonction: fonction || "", iban: iban || "" };
  const { fileId } = await readJsonFile(drive, PROFIL_FILENAME, profil);
  await writeJsonFile(drive, fileId, profil);
  return profil;
}
