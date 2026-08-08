import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./game-polish.css";
import "./game-responsive.css";

export const metadata: Metadata = {
  title: "Yazzy",
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
    <html lang="fr" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
