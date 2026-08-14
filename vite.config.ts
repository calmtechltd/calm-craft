import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "../../dist/ui",
  },
  plugins: [react()],
  root: "src/ui",
});
