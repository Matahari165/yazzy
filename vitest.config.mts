import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Le solveur exact couvre toutes les conservations possibles ; son test exhaustif
    // est volontairement plus long qu’un test d’unité ordinaire.
    testTimeout: 30_000,
  },
});
