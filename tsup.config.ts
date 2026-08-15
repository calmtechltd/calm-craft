import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: false,
  dts: false,
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  outDir: "dist/cli",
  platform: "node",
  sourcemap: true,
  splitting: false,
  target: "node22",
});
