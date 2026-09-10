import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children }) {
  const { loading, connecte } = useAuth();

  if (loading) {
    return (
      <div className="screen center-screen">
        <Spinner label="Chargement..." />
      </div>
    );
  }
  if (!connecte) {
    return <Navigate to="/connexion" replace />;
  }
  return children;
}
