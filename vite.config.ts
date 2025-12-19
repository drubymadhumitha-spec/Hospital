import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mochaPlugins } from "@getmocha/vite-plugins";

// Vite config for Netlify (no Cloudflare worker)
export default defineConfig({
  plugins: [
    // Mocha plugins for testing
    ...mochaPlugins(process.env as any),
    // React support
    react()
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
