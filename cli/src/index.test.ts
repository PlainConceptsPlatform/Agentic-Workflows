import { describe, expect, it, vi } from "vitest";

import { run } from "./index.js";

describe("workflows CLI", () => {
  it("prints template installation in help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["--help"])).resolves.toBe(0);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("--template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo"));
    log.mockRestore();
  });

  it("rejects an unsupported template", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(run(["add", "--template", "unknown"])).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith("add accepts only --force or --template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo.");
    error.mockRestore();
  });
});
