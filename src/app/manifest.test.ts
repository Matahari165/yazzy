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
});
