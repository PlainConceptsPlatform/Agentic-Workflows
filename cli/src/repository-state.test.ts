import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { inspectRepository, resolveVisibility, type CommandRunner } from "./repository-inspection.js";
import { initializeRepository, manifestRelativePath, readManifest, repositoryConfigRelativePath } from "./repository-state.js";
import { run } from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("repository inspection", () => {
  it("finds agent workflows and supported stack markers", async () => {
    const repositoryPath = await createRepository({
      ".github/workflows/agent-refine.md": "# Refine",
      ".github/workflows/agent-custom.md": "# Custom",
      ".github/workflows/other.md": "# Other",
      "package.json": "{}",
      "pnpm-lock.yaml": "lockfileVersion: '9.0'",
      "apps/api/Numa.slnx": "<Solution />",
      "openspec/changes/.gitkeep": "",
    });

    await expect(inspectRepository(repositoryPath)).resolves.toMatchObject({
      existingAgentWorkflows: ["agent-custom.md", "agent-refine.md"],
      stackHints: {
        packageJson: true,
        pnpmLockfile: true,
        solutionFiles: [join(repositoryPath, "apps", "api", "Numa.slnx")],
        openSpec: true,
      },
    });
  });

  it("uses an explicit visibility before environment or GitHub", async () => {
    const runner: CommandRunner = { run: async () => '{"visibility":"public"}' };
    await expect(resolveVisibility("repo", "private", { PLATFORM_WORKFLOWS_VISIBILITY: "public" }, runner)).resolves.toEqual({
      value: "private",
      source: "argument",
    });
  });

  it("falls back to private when GitHub CLI is unavailable", async () => {
    const runner: CommandRunner = { run: async () => Promise.reject(new Error("missing gh")) };
    await expect(resolveVisibility("repo", undefined, {}, runner)).resolves.toEqual({ value: "private", source: "fallback" });
  });
});

describe("repository initialization", () => {
  it("creates config once and updates the managed manifest", async () => {
    const repositoryPath = await createRepository({ "package.json": "{}" });
    const inspection = await inspectRepository(repositoryPath);
    const first = await initializeRepository(inspection, { value: "public", source: "argument" }, new Date("2026-08-12T00:00:00.000Z"));
    const configPath = join(repositoryPath, repositoryConfigRelativePath);

    await writeFile(configPath, "consumer settings\n", "utf8");
    const second = await initializeRepository(inspection, { value: "private", source: "fallback" }, new Date("2026-08-13T00:00:00.000Z"));

    expect(first.repositoryConfigCreated).toBe(true);
    expect(second.repositoryConfigCreated).toBe(false);
    await expect(readFile(configPath, "utf8")).resolves.toBe("consumer settings\n");
    await expect(readManifest(repositoryPath)).resolves.toMatchObject({
      initializedAt: "2026-08-13T00:00:00.000Z",
      visibility: "private",
      visibilitySource: "fallback",
    });
    await expect(readFile(join(repositoryPath, manifestRelativePath), "utf8")).resolves.toContain('"schemaVersion": 1');
  });
});

describe("CLI commands", () => {
  it("keeps init available", async () => {
    const repositoryPath = await createRepository({ "package.json": "{}" });
    const output = captureConsole("log");

    await expect(run(["init", "--visibility", "public"], repositoryPath)).resolves.toBe(0);
    expect(output.calls).toHaveLength(1);
    output.restore();
  });

  it("accepts update as an add alias", async () => {
    const repositoryPath = await createRepository({});
    const error = captureConsole("error");

    await expect(run(["update", "--invalid"], repositoryPath)).resolves.toBe(1);
    expect(error.calls).toEqual(["update accepts only --force."]);
    error.restore();
  });
});

function captureConsole(method: "error" | "log"): { readonly calls: string[]; readonly restore: () => void } {
  const original = console[method];
  const calls: string[] = [];
  console[method] = (message: string) => calls.push(message);
  return { calls, restore: () => { console[method] = original; } };
}

async function createRepository(files: Record<string, string>): Promise<string> {
  const repositoryPath = await mkdtemp(join(tmpdir(), "platform-workflows-"));
  temporaryDirectories.push(repositoryPath);
  await Promise.all(Object.entries(files).map(async ([relativePath, content]) => {
    const path = join(repositoryPath, relativePath);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
  }));
  return repositoryPath;
}
