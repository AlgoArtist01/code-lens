import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext.js";

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}