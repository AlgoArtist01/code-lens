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
          width: 240,
          background: "linear-gradient(180deg, var(--surface-raised) 0%, var(--surface) 100%)",
          borderRight: "1px solid var(--border)",
          padding: "1.75rem 1.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.3rem",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.15rem",
            marginBottom: "2rem",
            padding: "0 0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            className="mono"
            style={{
              color: "var(--accent)",
              textShadow: "0 0 16px var(--accent-glow)",
            }}
          >
            {'>'}
          </span>
          Code Lens
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
                gap: "0.7rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                color: isActive ? "var(--text)" : "var(--text-muted)",
                background: isActive
                  ? "linear-gradient(90deg, var(--accent-glow), transparent)"
                  : "transparent",
                border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.18s ease",
              })}
              onMouseEnter={(e) => {
                if (e.currentTarget.getAttribute("aria-current") !== "page")
                  e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.getAttribute("aria-current") !== "page")
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              borderRadius: "var(--radius-sm)",
              padding: "0.55rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.82rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.5rem 0.65rem",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#0B0E14",
                flexShrink: 0,
              }}
            >
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </span>
          </div>

          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              borderRadius: "var(--radius-sm)",
              padding: "0.55rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.82rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--critical)";
              e.currentTarget.style.color = "var(--critical)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            marginTop: "1rem",
            opacity: 0.7,
          }}
        >
          Built by Emm Zee
        </div>
      </aside>
      <main className="fade-in" style={{ flex: 1, padding: "2.5rem", maxWidth: 1200 }}>
        <Outlet />
      </main>
    </div>
  );
}