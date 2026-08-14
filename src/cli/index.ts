import { runCli } from "./command";

process.exitCode = await runCli(process.argv.slice(2));
