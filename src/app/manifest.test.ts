import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("keeps every Yazzy route inside the standalone app", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
  });

  it("uses the Yazzy palette and installable PNG icons", () => {
    expect(manifest()).toMatchObject({
      background_color: "#f7f1e8",
      theme_color: "#ed896e",
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
    });
  });
});
