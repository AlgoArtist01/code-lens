import { useAuth } from "../lib/AuthContext.js";

export function Profile() {
  const { user } = useAuth();
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Profile</h1>
      <p style={{ color: "var(--text-muted)" }}>{user?.email}</p>
    </div>
  );
}