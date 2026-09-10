import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Reglages() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Réglages</h1>
      </header>

      <div className="settings-card">
        <span className="text-muted">Compte Google connecté</span>
        <strong>{email || "Inconnu"}</strong>
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={onLogout}>
        Se déconnecter
      </button>
    </div>
  );
}
