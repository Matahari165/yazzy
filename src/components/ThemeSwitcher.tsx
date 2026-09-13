export type UITheme = "craft" | "riviera" | "ceramic" | "botanic" | "pastel";

export interface ThemeOption {
  id: UITheme;
  label: string;
  dotColor: string;
  fontBadge: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "craft", label: "Atelier", dotColor: "#D95338", fontBadge: "Fraunces" },
  { id: "riviera", label: "Riviera", dotColor: "#F27A6D", fontBadge: "DM Serif" },
  { id: "ceramic", label: "Céramique", dotColor: "#C85A32", fontBadge: "Bricolage" },
  { id: "botanic", label: "Botanique", dotColor: "#4E8A5E", fontBadge: "Sauge" },
  { id: "pastel", label: "Nuage", dotColor: "#7C62D6", fontBadge: "Syne" },
];

const STORAGE_KEY = "yazzy.ui_theme";

interface ThemeSwitcherProps {
  currentTheme: UITheme;
  onSelectTheme: (theme: UITheme) => void;
}

export function ThemeSwitcher({ currentTheme, onSelectTheme }: ThemeSwitcherProps) {
  return (
    <aside className="theme-switcher-wrapper" aria-label="Sélecteur d'identité visuelle">
      <div className="theme-switcher-bar" role="radiogroup" aria-label="Identités visuelles">
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
              <span
                className="theme-switcher-dot"
                style={{ backgroundColor: theme.dotColor }}
                aria-hidden="true"
              />
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
