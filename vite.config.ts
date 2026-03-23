import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// dyadComponentTagger is only available in the Dyad dev environment
let dyadPlugin: (() => unknown) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  dyadPlugin = require("@dyad-sh/react-vite-component-tagger").default;
} catch {
  // not installed (production/VPS), skip
}

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 55118,
    allowedHosts: ["scada.centrii.com", "3.16.14.21"],
  },
  plugins: [
    ...(dyadPlugin ? [dyadPlugin()] : []),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
