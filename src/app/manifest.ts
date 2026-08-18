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
    background_color: "#fff8f4",
    theme_color: "#f49a7a",
    icons: [
      {
        src: "/icon.jpg",
        sizes: "1024x1024",
        type: "image/jpeg",
      },
    ],
  };
}
