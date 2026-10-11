import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, requiredAccess }) {
  const { user, loading, access, accessLoading } = useAuth();

  if (loading || (user && accessLoading)) {
    return <div className="route-loading">Loading workspace…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredAccess && !access[requiredAccess]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
