import { execFile } from "node:child_process";

export type BrowserOpener = (url: string) => Promise<void>;

export const openBrowser: BrowserOpener = (url) =>
  new Promise((resolve, reject) => {
    const platform = process.platform;
    const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
    const args = platform === "win32" ? ["/c", "start", "", url] : [url];
    const child = execFile(command, args, { windowsHide: true }, (error) =>
      error ? reject(error) : resolve(),
    );
    child.unref();
  });
