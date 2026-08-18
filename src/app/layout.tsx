import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./game-polish.css";
import "./game-responsive.css";

export const metadata: Metadata = {
  title: "Yazzy",
  description: "Le Yatzy qui explique chaque probabilité et chaque décision.",
  applicationName: "Yazzy",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yazzy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ed896e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
