import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import "./base.css";
import "./lobby.css";
import "./game.css";
import "./quiz.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--yazzy-display",
  display: "swap",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--yazzy-body",
  display: "swap",
});

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
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#e8e0d0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
