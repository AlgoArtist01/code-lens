import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.js";
import { useTheme } from "../lib/ThemeContext.js";
import { LayoutDashboard, Settings as SettingsIcon, User, Moon, Sun, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/profile", label: "Profile", icon: User },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem", padding: "0 0.5rem" }}>
          <span className="mono" style={{ color: "var(--accent)" }}>{'>'}</span> CodeReview
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.55rem 0.75rem",
                borderRadius: 8,
                textDecoration: "none",
                color: isActive ? "var(--text)" : "var(--text-muted)",
                background: isActive ? "var(--surface-raised)" : "transparent",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                fontSize: "0.9rem",
                transition: "background 0.15s ease, color 0.15s ease",
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes("surface-raised"))
                  e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.getAttribute("aria-current") !== "page")
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              borderRadius: 8,
              padding: "0.45rem 0.65rem",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 0.5rem" }}>{user?.email}</div>
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              borderRadius: 8,
              padding: "0.45rem 0.65rem",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "2rem", maxWidth: 1100 }}>
        <Outlet />
      </main>
    </div>
  );
}