import { afterEach, describe, expect, it } from "vitest";

import { createGitFixture, removeGitFixture } from "../../test/helpers/git-fixture";
import {
  DEVELOPMENT_HELP_TEXT,
  parseDevelopmentArguments,
  startDevelopmentSession,
  type DevelopmentSession,
} from ".";

const repositories: string[] = [];
const sessions: DevelopmentSession[] = [];

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.close()));
  await Promise.all(repositories.splice(0).map(removeGitFixture));
});

describe("CalmCraft development server", () => {
  it("accepts CLI view options plus a separate Vite port", () => {
    expect(parseDevelopmentArguments(["--help"])).toEqual({ command: "help" });
    expect(DEVELOPMENT_HELP_TEXT).toContain("UI hot reload");
    expect(
      parseDevelopmentArguments(
        ["--", "/tmp/product", "--diff", "--base", "main", "--no-open", "--ui-port", "4313"],
        "/tmp/default",
      ),
    ).toMatchObject({
      uiPort: 4313,
      view: {
        source: "/tmp/product",
        diff: true,
        base: "main",
        openBrowser: false,
      },
    });
    expect(() => parseDevelopmentArguments(["--ui-port", "0"])).toThrow(/1 to 65535/u);
  });

  it("serves source UI with a token-protected proxy to real repository data", async () => {
    const repository = await createGitFixture();
    repositories.push(repository);
    const active = await startDevelopmentSession(
      {
        view: {
          command: "view",
          source: repository,
          diff: false,
          openBrowser: false,
        },
      },
      { io: { stdout: () => undefined, stderr: () => undefined } },
    );
    sessions.push(active);

    const document = await fetch(active.url);
    expect(document.status).toBe(200);
    expect(await document.text()).toContain("/main.tsx");

    const token = new URL(active.url).searchParams.get("token");
    const missingToken = await fetch(`http://127.0.0.1:${active.uiPort}/api/session`);
    const response = await fetch(
      `http://127.0.0.1:${active.uiPort}/api/session?token=${encodeURIComponent(token ?? "")}`,
    );
    expect(missingToken.status).toBe(401);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("fixture-original");

    const uiPort = active.uiPort;
    await active.close();
    await expect(fetch(`http://127.0.0.1:${uiPort}/`)).rejects.toThrow();
  });
});
