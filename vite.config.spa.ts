// Plain Vite SPA build used for the whole app (web SPA + Capacitor mobile).
// `bun run build` (or `build:mobile`) outputs static files to ./dist — that's what Capacitor copies
// The Lovable web preview/publish pipeline still uses vite.config.ts (TanStack Start) via `build:web`.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Virtual modules that only the TanStack Start plugin knows how to provide. The mobile
// bundle never renders on a server, so empty manifests are enough to satisfy the imports.
const startStubs = () => ({
  name: "start-virtual-stubs",
  resolveId(id: string) {
    if (id.startsWith("tanstack-start-manifest:") || id.startsWith("tanstack-server-fn-manifest:")) {
      return `\0${id}`;
    }
    return null;
  },
  load(id: string) {
    if (id.startsWith("\0tanstack-start-manifest:")) {
      return "export const tsrStartManifest = () => ({ routes: {} });\nexport default { routes: {} };";
    }
    if (id.startsWith("\0tanstack-server-fn-manifest:")) {
      return "export default {};";
    }
    return null;
  },
});

export default defineConfig({
  root: path.resolve(import.meta.dirname, "spa"),
  publicDir: path.resolve(import.meta.dirname, "public"),
  plugins: [react(), tailwindcss(), tsconfigPaths({ root: import.meta.dirname }), startStubs()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // TanStack Start's server entry specifier is only resolvable by the Start plugin.
      "#tanstack-start-entry": path.resolve(import.meta.dirname, "src/start.ts"),
      "#tanstack-router-entry": path.resolve(import.meta.dirname, "src/router.tsx"),

    },
  },
  define: { "process.env": "{}" },

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
