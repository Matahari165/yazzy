import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Space_Grotesk,
  Fraunces,
  Syne,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  DM_Serif_Display,
  Outfit,
  Space_Mono,
} from "next/font/google";
import "./base.css";
import "./lobby.css";
import "./themes.css";
import "./game.css";
import "./quiz.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--yazzy-body",
  display: "swap",
});

const frauncesFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const syneFont = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const jakartaFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const dmSerifFont = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const outfitFont = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceMonoFont = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
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
      className={`${displayFont.variable} ${bodyFont.variable} ${frauncesFont.variable} ${syneFont.variable} ${jakartaFont.variable} ${jetbrainsFont.variable} ${dmSerifFont.variable} ${outfitFont.variable} ${spaceMonoFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
