import { runDevelopment } from "../src/dev";

process.exitCode = await runDevelopment(process.argv.slice(2));
