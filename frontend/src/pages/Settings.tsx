import { useTheme } from "../lib/ThemeContext.js";
import { Moon, Sun, Bell, Shield, LucideIcon } from "lucide-react";

export function Settings() {
  const { theme, toggleTheme } = useTheme();

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

      <SettingsSection title="Notifications" icon={Bell}>
        <SettingsRow label="Review completion emails" description="Not yet available">
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Coming soon</span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Security" icon={Shield}>
        <SettingsRow label="Change password" description="Not yet available">
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Coming soon</span>
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