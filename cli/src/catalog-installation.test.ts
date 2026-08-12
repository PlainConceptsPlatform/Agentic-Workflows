import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { catalogSourcePath, installCatalog, installTemplate } from "./catalog-installation.js";

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

  it("installs package-owned loops files", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "name: Check\n",
      "workflows/agent-check.md": "# Check\n",
      "workflows/shared/defaults.md": "defaults\n",
      "scripts/compile.mjs": "console.log('compile');\n",
      "workflows/agent-check.lock.yml": "generated\n",
      "actions/actions-lock.json": "generated\n",
    });
    const repositoryPath = await createDirectory({});

    await expect(installCatalog(repositoryPath, { sourcePath })).resolves.toEqual({
      installed: [
        ".github/actions/check/action.yml",
        ".github/workflows/agent-check.md",
        ".github/workflows/shared/defaults.md",
        "scripts/compile.mjs",
      ],
      conflicts: [],
    });
  });

  it("copies ownership headers for base workflows and selected templates", async () => {
    const header = "# Managed by @plainconceptsplatform/workflows. Source: loops/workflows/agent-check.md. Update with `platform-workflows update --force`; consumer edits may be overwritten.\n";
    const templateHeader = "# Managed by @plainconceptsplatform/workflows. Source: loops/templates/agentics/agentics-checks.yml. Update with `platform-workflows update --force`; consumer edits may be overwritten.\n";
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "# Managed by @plainconceptsplatform/workflows. Source: loops/actions/check/action.yml. Update with `platform-workflows update --force`; consumer edits may be overwritten.\nname: Check\n",
      "workflows/agent-check.md": `---\n${header}# Check\n`,
      "scripts/compile.mjs": "// Managed by @plainconceptsplatform/workflows. Source: loops/scripts/compile.mjs. Update with `platform-workflows update --force`; consumer edits may be overwritten.\n",
      "templates/agentics/agentics-checks.yml": `${templateHeader}name: Agentics checks\n`,
    });
    const repositoryPath = await createDirectory({});

    await installCatalog(repositoryPath, { sourcePath });
    await installTemplate(repositoryPath, "agentics-checks", { sourcePath });

    await expect(readFile(join(repositoryPath, ".github/workflows/agent-check.md"), "utf8")).resolves.toMatch(new RegExp(`^---\\n${escapeRegularExpression(header)}`));
    await expect(readFile(join(repositoryPath, ".github/workflows/agentics-checks.yml"), "utf8")).resolves.toMatch(new RegExp(`^${escapeRegularExpression(templateHeader)}`));
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

  it("does not manage legacy repository configuration files", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "name: Check\n",
      "workflows/agent-check.md": "# Check\n",
      "scripts/compile.mjs": "compile\n",
    });
    const repositoryPath = await createDirectory({
      ".github/workflows/shared/repo-config.md": "legacy consumer config\n",
    });

    await expect(installCatalog(repositoryPath, { sourcePath })).resolves.toMatchObject({
      installed: [
        ".github/actions/check/action.yml",
        ".github/workflows/agent-check.md",
        "scripts/compile.mjs",
      ],
      conflicts: [],
    });
    await expect(readFile(join(repositoryPath, ".github/workflows/shared/repo-config.md"), "utf8")).resolves.toBe("legacy consumer config\n");
  });

  it("requires force for different managed files", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "package action\n",
      "workflows/agent-check.md": "package workflow\n",
      "scripts/compile.mjs": "package script\n",
    });
    const repositoryPath = await createDirectory({
      ".github/actions/check/action.yml": "consumer action\n",
      ".github/workflows/agent-check.md": "consumer workflow\n",
      "scripts/compile.mjs": "consumer script\n",
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
  });

  it("installs templates only when explicitly selected", async () => {
    const sourcePath = await createDirectory({
      "actions/check/action.yml": "name: Check\n",
      "workflows/agent-check.md": "# Check\n",
      "scripts/compile.mjs": "compile\n",
      "templates/agentics/agentics-checks.yml": "name: Agentics checks\n",
      "templates/ci/app-ci-node-monorepo.yml": "name: Node CI\n",
    });
    const repositoryPath = await createDirectory({});

    await installCatalog(repositoryPath, { sourcePath });
    await expect(readFile(join(repositoryPath, ".github/workflows/agentics-checks.yml"), "utf8")).rejects.toThrow();
    await expect(installTemplate(repositoryPath, "agentics-checks", { sourcePath })).resolves.toEqual({
      installed: [".github/workflows/agentics-checks.yml"],
      conflicts: [],
    });
    await expect(installTemplate(repositoryPath, "app-ci-node-monorepo", { sourcePath })).resolves.toEqual({
      installed: [".github/workflows/app-ci-node-monorepo.yml"],
      conflicts: [],
    });
  });

  it("requires force to replace a selected template", async () => {
    const sourcePath = await createDirectory({
      "templates/agentics/agentics-checks.yml": "package template\n",
    });
    const repositoryPath = await createDirectory({
      ".github/workflows/agentics-checks.yml": "consumer template\n",
    });

    await expect(installTemplate(repositoryPath, "agentics-checks", { sourcePath })).resolves.toEqual({
      installed: [],
      conflicts: [".github/workflows/agentics-checks.yml"],
    });
    await expect(installTemplate(repositoryPath, "agentics-checks", { force: true, sourcePath })).resolves.toMatchObject({
      installed: [".github/workflows/agentics-checks.yml"],
    });
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

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
