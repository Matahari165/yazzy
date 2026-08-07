import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./game-polish.css";
import "./game-responsive.css";

export const metadata: Metadata = {
  title: "Yazzy — Joue, calcule, progresse",
  description: "Le Yatzy qui explique chaque probabilité et chaque décision.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f49a7a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#main-content">Aller au jeu</a>
        {children}
      </body>
    </html>
  );
}
