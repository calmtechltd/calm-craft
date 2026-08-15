import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "../../dist/ui",
  },
  plugins: [react()],
  root: "src/ui",
});
