import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { catalogSourcePath, installCatalog, repositoryConfigRelativePath } from "./catalog-installation.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("catalog installation", () => {
  it("resolves loops beside built package files", async () => {
    const packageDirectory = await createDirectory({
      "dist/catalog-installation.js": "export {};\n",
      "loops/workflows/agent-check.md": "# Check\n",
    });

    expect(catalogSourcePath(join(packageDirectory, "dist", "catalog-installation.js"))).toBe(join(packageDirectory, "loops"));
  });

  it("installs package-owned loops files and initializes repository config", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "name: Check\n",
      "workflows/agent-check.md": "# Check\n",
      "workflows/shared/defaults.md": "defaults\n",
      "scripts/compile.mjs": "console.log('compile');\n",
      "aw/repo-config.md": "# Repository configuration\n",
      "workflows/agent-check.lock.yml": "generated\n",
      "actions/actions-lock.json": "generated\n",
    });
    const repositoryPath = await createDirectory({});

    await expect(installCatalog(repositoryPath, { sourcePath })).resolves.toEqual({
      installed: [
        ".github/actions/check/action.yml",
        ".github/workflows/agent-check.md",
        ".github/workflows/shared/defaults.md",
        repositoryConfigRelativePath,
        "scripts/compile.mjs",
      ],
      conflicts: [],
    });
    await expect(readFile(join(repositoryPath, repositoryConfigRelativePath), "utf8")).resolves.toBe("# Repository configuration\n");
  });

  it("does not report identical managed files as conflicts", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "name: Check\n",
      "workflows/agent-check.md": "# Check\n",
      "scripts/compile.mjs": "compile\n",
    });
    const repositoryPath = await createDirectory({ ".github/workflows/agent-check.md": "# Check\n" });

    await expect(installCatalog(repositoryPath, { sourcePath })).resolves.toMatchObject({ conflicts: [] });
  });

  it("requires force for different managed files and preserves repository config", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "package action\n",
      "workflows/agent-check.md": "package workflow\n",
      "scripts/compile.mjs": "package script\n",
      "aw/repo-config.md": "package config\n",
    });
    const repositoryPath = await createDirectory({
      ".github/actions/check/action.yml": "consumer action\n",
      ".github/workflows/agent-check.md": "consumer workflow\n",
      "scripts/compile.mjs": "consumer script\n",
      [repositoryConfigRelativePath]: "consumer config\n",
    });

    await expect(installCatalog(repositoryPath, { sourcePath })).resolves.toEqual({
      installed: [],
      conflicts: [
        ".github/actions/check/action.yml",
        ".github/workflows/agent-check.md",
        "scripts/compile.mjs",
      ],
    });

    await expect(installCatalog(repositoryPath, { force: true, sourcePath })).resolves.toMatchObject({
      conflicts: [
        ".github/actions/check/action.yml",
        ".github/workflows/agent-check.md",
        "scripts/compile.mjs",
      ],
    });
    await expect(readFile(join(repositoryPath, ".github/actions/check/action.yml"), "utf8")).resolves.toBe("package action\n");
    await expect(readFile(join(repositoryPath, repositoryConfigRelativePath), "utf8")).resolves.toBe("consumer config\n");
  });
});

async function createDirectory(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "platform-workflows-"));
  temporaryDirectories.push(directory);
  await Promise.all(Object.entries(files).map(async ([relativePath, content]) => {
    const path = join(directory, relativePath);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }));
  return directory;
}
