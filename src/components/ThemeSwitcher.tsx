export type UITheme = "ceramic" | "dark";

export interface ThemeOption {
  id: UITheme;
  label: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "ceramic", label: "Clair" },
  { id: "dark", label: "Sombre" },
];

const STORAGE_KEY = "yazzy.ui_theme";

interface ThemeSwitcherProps {
  currentTheme: UITheme;
  onSelectTheme: (theme: UITheme) => void;
}

export function ThemeSwitcher({ currentTheme, onSelectTheme }: ThemeSwitcherProps) {
  return (
    <aside className="theme-switcher-wrapper" aria-label="Mode d'affichage">
      <div className="theme-switcher-bar" role="radiogroup" aria-label="Clair ou sombre">
        {THEME_OPTIONS.map((theme) => {
          const isActive = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-active={isActive}
              className="theme-switcher-btn"
              onClick={() => {
                onSelectTheme(theme.id);
                try {
                  localStorage.setItem(STORAGE_KEY, theme.id);
                } catch {}
              }}
            >
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function getSavedTheme(): UITheme {
  if (typeof window === "undefined") return "ceramic";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as UITheme;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return "ceramic";
}

export function applySavedTheme(): void {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.setAttribute("data-theme", getSavedTheme());
  } catch {}
}
