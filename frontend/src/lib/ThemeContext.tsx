import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LIGHT_OVERRIDES: Record<string, string> = {
  "--bg": "#F4F6FB",
  "--surface": "#FFFFFF",
  "--surface-raised": "#FFFFFF",
  "--surface-hover": "#F0F2F8",
  "--border": "rgba(20, 25, 40, 0.08)",
  "--border-strong": "rgba(20, 25, 40, 0.16)",
  "--text": "#12161F",
  "--text-muted": "#6B7280",
};

const DARK_DEFAULTS: Record<string, string> = {
  "--bg": "#0B0E14",
  "--surface": "#12161F",
  "--surface-raised": "#1A1F2B",
  "--surface-hover": "#212736",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(255, 255, 255, 0.14)",
  "--text": "#EDEFF3",
  "--text-muted": "#8A93A6",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("theme") as Theme) || "dark"
  );

  useEffect(() => {
    const overrides = theme === "light" ? LIGHT_OVERRIDES : DARK_DEFAULTS;
    for (const [key, value] of Object.entries(overrides)) {
      document.documentElement.style.setProperty(key, value);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}