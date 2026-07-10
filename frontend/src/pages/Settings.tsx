import { useTheme } from "../lib/ThemeContext.js";
import { Moon, Sun, LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.js";
import { Trash2 } from "lucide-react";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/account");
      logout();
      navigate("/login");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Settings</h1>

      <SettingsSection title="Appearance" icon={theme === "dark" ? Moon : Sun}>
        <SettingsRow label="Theme" description="Switch between light and dark mode">
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              padding: "0.45rem 0.9rem",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Danger Zone" icon={Trash2}>
        <SettingsRow label="Delete account" description="Permanently removes your account and all repositories">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--critical)",
                borderRadius: 8,
                color: "var(--critical)",
                padding: "0.45rem 0.9rem",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Delete account
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  background: "var(--critical)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "0.45rem 0.9rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  padding: "0.45rem 0.9rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "1.25rem",
        marginBottom: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Icon size={16} />
        <h2 style={{ fontSize: "0.95rem", margin: 0, color: "var(--text-muted)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{description}</div>
      </div>
      {children}
    </div>
  );
}