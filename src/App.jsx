import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ScanProvider } from "./context/ScanContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Connexion from "./screens/Connexion";
import Accueil from "./screens/Accueil";
import VueAnnuelle from "./screens/VueAnnuelle";
import DetailDepense from "./screens/DetailDepense";
import Scanner from "./screens/Scanner";
import AnalyseEnCours from "./screens/AnalyseEnCours";
import Verification from "./screens/Verification";
import Confirmation from "./screens/Confirmation";
import Export from "./screens/Export";
import Reglages from "./screens/Reglages";
import ModeleExcel from "./screens/ModeleExcel";
import PolitiqueConfidentialite from "./screens/PolitiqueConfidentialite";

export default function App() {
  return (
    <AuthProvider>
      <ScanProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Accueil />} />
              <Route path="/annee/:year" element={<VueAnnuelle />} />
              <Route path="/depense/:id" element={<DetailDepense />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/analyse" element={<AnalyseEnCours />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/export" element={<Export />} />
              <Route path="/reglages" element={<Reglages />} />
              <Route path="/modele-excel" element={<ModeleExcel />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ScanProvider>
    </AuthProvider>
  );
}
