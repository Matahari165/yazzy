import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Yazzy",
    short_name: "Yazzy",
    description: "Le Yatzy qui explique chaque probabilité et chaque décision.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3efea",
    theme_color: "#f3efea",
    icons: [
      {
        src: "/icons/yazzy-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/yazzy-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/yazzy-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
