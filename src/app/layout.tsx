import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./game-polish.css";

export const metadata: Metadata = {
  title: "Yazzy — Joue, calcule, progresse",
  description: "Le Yatzy qui explique chaque probabilité et chaque décision.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#171713" },
  ],
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
