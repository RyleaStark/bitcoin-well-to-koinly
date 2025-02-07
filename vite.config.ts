import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  // Set the project root explicitly (current directory)
  root: ".",
  plugins: [react()],
  build: {
    // Specify index.html as the entry point for Rollup
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
    outDir: "dist", // Output directory for the production build
  },
});
