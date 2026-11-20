import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `@/*` path alias from tsconfig.json.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Component tests opt into jsdom via a per-file
    // `// @vitest-environment jsdom` docblock; everything else runs in node.
    environment: "node",
    // Testing Library's per-test DOM cleanup hooks onto a global afterEach.
    globals: true,
    // A fixed device zone, so "show times in Local" gives the same answer on every machine.
    env: { TZ: "UTC" },
    // Node 26's own localStorage hides jsdom's and refuses to work without a file; tests use jsdom's, as a browser would.
    execArgv: ["--no-experimental-webstorage"],
  },
});
