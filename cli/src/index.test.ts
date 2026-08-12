import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("workflows CLI", () => {
  it("prints template names in help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["--help"])).resolves.toBe(0);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("agentics-checks"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("app-ci-dotnet-next"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("opencode.ci.json"));
    log.mockRestore();
  });

  it("rejects an unsupported template", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(run(["add", "--template", "unknown"])).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith("add accepts only --force or --template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo|opencode.ci.json.");
    error.mockRestore();
  });

  it("lists all workflows and templates with install status [ ] when none installed", async () => {
    const repositoryPath = await createRepository({});
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["list"], repositoryPath)).resolves.toBe(0);

    expect(log).toHaveBeenCalledTimes(1);
    const output = log.mock.calls[0]![0] as string;
    expect(output).toContain("Workflows:");
    expect(output).toContain("Templates:");
    expect(output).toContain("refine");
    expect(output).toContain("implement");
    expect(output).toContain("agentics-checks");
    expect(output).toContain("app-ci-dotnet-next");
    // None installed: all [ ]
    const installedCount = (output.match(/\[x\]/g) ?? []).length;
    expect(installedCount).toBe(0);
    // 7 routes + 5 templates = 12 entries
    const uninstalledCount = (output.match(/\[ \]/g) ?? []).length;
    expect(uninstalledCount).toBe(12);
    log.mockRestore();
  });

  it("marks installed workflows with [x]", async () => {
    const repositoryPath = await createRepository({
      ".github/workflows/agent-refine.md": "# Refine",
      ".github/workflows/agentics-checks.yml": "name: Agentics checks",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["list"], repositoryPath)).resolves.toBe(0);

    const output = log.mock.calls[0]![0] as string;
    const installed = output.match(/(\[x\])/g) ?? [];
    expect(installed.length).toBe(2);
    // refine and agentics-checks should be [x]
    const refineLines = output.split("\n").filter((line) => line.includes("refine") || line.includes("agentics-checks"));
    expect(refineLines.filter((line) => line.includes("[x]"))).toHaveLength(2);
    log.mockRestore();
  });

  it("search filters by name", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["search", "audit"])).resolves.toBe(0);

    const output = log.mock.calls[0]![0] as string;
    expect(output).toContain("audit");
    expect(output).not.toContain("Templates:");
    // Only the audit route should be returned — no other route name should appear.
    const visibleRoutes = ["refine", "implement", "direct", "apply-review", "merge-gate", "propose"];
    for (const route of visibleRoutes) {
      expect(output).not.toContain(`${route} —`);
    }
    log.mockRestore();
  });

  it("search filters by description keyword", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["search", "CI"])).resolves.toBe(0);

    const output = log.mock.calls[0]![0] as string;
    expect(output).toContain("dotnet-next");
    expect(output).toContain("node-monorepo");
    expect(output).not.toContain("refine");
    log.mockRestore();
  });

  it("search with no matches prints a no-match message", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(run(["search", "nonexistent"])).resolves.toBe(0);

    const output = log.mock.calls[0]![0] as string;
    expect(output).toBe("No workflows matched the search query.");
    log.mockRestore();
  });

  it("search with no query fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(run(["search"])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith("search requires exactly one query argument.");
    error.mockRestore();
  });

  it("search with too many arguments fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(run(["search", "a", "b"])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith("search requires exactly one query argument.");
    error.mockRestore();
  });
});

async function createRepository(files: Record<string, string>): Promise<string> {
  const repositoryPath = await mkdtemp(join(tmpdir(), "workflows-"));
  temporaryDirectories.push(repositoryPath);
  await Promise.all(Object.entries(files).map(async ([relativePath, content]) => {
    const path = join(repositoryPath, relativePath);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
  }));
  return repositoryPath;
}
