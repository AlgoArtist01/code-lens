import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LIGHT_OVERRIDES: Record<string, string> = {
  "--bg": "#F7F8FA",
  "--surface": "#FFFFFF",
  "--surface-raised": "#F0F2F5",
  "--border": "#E1E4E8",
  "--text": "#1A1D23",
  "--text-muted": "#6B7280",
};

const DARK_DEFAULTS: Record<string, string> = {
  "--bg": "#14171C",
  "--surface": "#1C2028",
  "--surface-raised": "#23272F",
  "--border": "#2C313A",
  "--text": "#E6E8EB",
  "--text-muted": "#8B92A0",
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