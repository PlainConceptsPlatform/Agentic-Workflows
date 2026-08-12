import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { RepositoryInspection, RepositoryVisibility, VisibilityResolution } from "./repository-inspection.js";

export const manifestRelativePath = ".github/workflows/shared/platform-workflows.json";
export const repositoryConfigRelativePath = ".github/workflows/shared/repo-config.md";

export interface PlatformWorkflowsManifest {
  readonly schemaVersion: 1;
  readonly repositoryPath: string;
  readonly initializedAt: string;
  readonly visibility: RepositoryVisibility;
  readonly visibilitySource: VisibilityResolution["source"];
  readonly existingAgentWorkflows: readonly string[];
  readonly stackHints: RepositoryInspection["stackHints"];
}

export interface InitializationResult {
  readonly manifest: PlatformWorkflowsManifest;
  readonly repositoryConfigCreated: boolean;
}

export async function initializeRepository(
  inspection: RepositoryInspection,
  visibility: VisibilityResolution,
  now: Date = new Date(),
): Promise<InitializationResult> {
  const configPath = join(inspection.repositoryPath, repositoryConfigRelativePath);
  const repositoryConfigCreated = await writeRepositoryConfigIfMissing(configPath, inspection, visibility.value);
  const manifest: PlatformWorkflowsManifest = {
    schemaVersion: 1,
    repositoryPath: inspection.repositoryPath,
    initializedAt: now.toISOString(),
    visibility: visibility.value,
    visibilitySource: visibility.source,
    existingAgentWorkflows: inspection.existingAgentWorkflows,
    stackHints: inspection.stackHints,
  };

  await writeFile(join(inspection.repositoryPath, manifestRelativePath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, repositoryConfigCreated };
}

export async function readManifest(repositoryPath: string): Promise<PlatformWorkflowsManifest | undefined> {
  try {
    const content = await readFile(join(repositoryPath, manifestRelativePath), "utf8");
    return parseManifest(JSON.parse(content));
  } catch {
    return undefined;
  }
}

async function writeRepositoryConfigIfMissing(
  configPath: string,
  inspection: RepositoryInspection,
  visibility: RepositoryVisibility,
): Promise<boolean> {
  try {
    await readFile(configPath, "utf8");
    return false;
  } catch {
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, createRepositoryConfig(inspection, visibility), { encoding: "utf8", flag: "wx" });
    return true;
  }
}

function createRepositoryConfig(inspection: RepositoryInspection, visibility: RepositoryVisibility): string {
  const stack = [
    inspection.stackHints.packageJson ? "- Node.js (`package.json`)" : undefined,
    inspection.stackHints.pnpmLockfile ? "- pnpm (`pnpm-lock.yaml`)" : undefined,
    ...inspection.stackHints.solutionFiles.map((file) => `- .NET solution (${file})`),
    inspection.stackHints.openSpec ? "- OpenSpec (`openspec/`)" : undefined,
  ].filter((hint): hint is string => hint !== undefined);

  return [
    "# Repository workflow configuration",
    "",
    `- Visibility: ${visibility}`,
    "",
    "## Detected stack",
    "",
    ...(stack.length > 0 ? stack : ["- No supported stack markers detected"]),
    "",
    "## Verification commands",
    "",
    "Add repository-specific verification commands here.",
    "",
    "## Repository rules",
    "",
    "Add repository-specific workflow rules here.",
    "",
  ].join("\n");
}

function parseManifest(value: unknown): PlatformWorkflowsManifest | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const manifest = value as Partial<PlatformWorkflowsManifest>;
  if (manifest.schemaVersion !== 1 || typeof manifest.repositoryPath !== "string" || typeof manifest.initializedAt !== "string") return undefined;
  if (manifest.visibility !== "public" && manifest.visibility !== "private") return undefined;
  if (!Array.isArray(manifest.existingAgentWorkflows) || typeof manifest.stackHints !== "object" || manifest.stackHints === null) return undefined;
  return manifest as PlatformWorkflowsManifest;
}
