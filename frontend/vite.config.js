import path from "node:path"
import vue from "@vitejs/plugin-vue"
import frappeui from "frappe-ui/vite"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    frappeui({
      frappeProxy: true,
      jinjaBootData: true,
      lucideIcons: true,
      buildConfig: {
        indexHtmlPath: "../tahp/www/frontend.html",
        emptyOutDir: true,
        sourcemap: true,
      },
    }),
    vue(),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    outDir: "../tahp/public/frontend",
    emptyOutDir: true,
    target: "es2015",
    sourcemap: true,
    rollupOptions: {
      output: {
        format: "iife",
        entryFileNames: "index.js",
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "tailwind.config.js": path.resolve(__dirname, "tailwind.config.js"),
    },
  },
  optimizeDeps: {
    include: ["feather-icons", "showdown", "highlight.js/lib/core", "interactjs"],
  },
  server: {
    allowedHosts: true,
  },
})
