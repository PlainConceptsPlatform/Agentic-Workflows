import { access, copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { repositoryConfigRelativePath } from "./repository-state.js";

export interface CatalogInstallResult {
  readonly installed: readonly string[];
  readonly conflicts: readonly string[];
}

export interface CatalogInstallOptions {
  readonly force?: boolean;
  readonly sourcePath?: string;
}

interface CatalogFile {
  readonly source: string;
  readonly target: string;
  readonly managed: boolean;
}

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceMappings = [
  ["actions", ".github/actions"],
  ["workflows", ".github/workflows"],
  ["scripts", "scripts"],
] as const;

export function catalogSourcePath(): string {
  return join(packageDirectory, "loops");
}

export async function installCatalog(
  repositoryPath: string,
  options: CatalogInstallOptions = {},
): Promise<CatalogInstallResult> {
  const sourcePath = options.sourcePath ?? catalogSourcePath();
  const files = await catalogFiles(sourcePath);
  const managedFiles = files.filter((file) => file.managed);
  const conflicts = (await Promise.all(managedFiles.map(async (file) => {
    const destination = join(repositoryPath, file.target);
    return await exists(destination) && !(await filesMatch(file.source, destination)) ? file.target : undefined;
  }))).filter((file): file is string => file !== undefined);

  if (conflicts.length > 0 && !options.force) return { installed: [], conflicts };

  await Promise.all(files.map(async (file) => {
    const destination = join(repositoryPath, file.target);
    if (!file.managed && await exists(destination)) return;
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(file.source, destination);
  }));

  return { installed: files.map((file) => file.target), conflicts };
}

async function catalogFiles(sourcePath: string): Promise<CatalogFile[]> {
  const files: CatalogFile[] = [];

  for (const [sourceDirectory, targetDirectory] of sourceMappings) {
    for (const file of await filesIn(join(sourcePath, sourceDirectory))) {
      if (isGeneratedFile(file)) continue;
      files.push({
        source: join(sourcePath, sourceDirectory, file),
        target: `${targetDirectory}/${file.replaceAll("\\", "/")}`,
        managed: true,
      });
    }
  }

  const repositoryConfigSource = join(sourcePath, "aw", "repo-config.md");
  if (await exists(repositoryConfigSource)) {
    files.push({ source: repositoryConfigSource, target: repositoryConfigRelativePath, managed: false });
  }

  return files.sort((left, right) => left.target.localeCompare(right.target));
}

function isGeneratedFile(file: string): boolean {
  const normalized = file.replaceAll("\\", "/");
  return normalized.endsWith(".lock.yml") || normalized.endsWith("actions-lock.json");
}

async function filesIn(path: string): Promise<string[]> {
  const entries = await readdir(path, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.parentPath === undefined ? entry.name : relative(path, join(entry.parentPath, entry.name)));
}

async function filesMatch(source: string, destination: string): Promise<boolean> {
  try {
    const [sourceContent, destinationContent] = await Promise.all([readFile(source), readFile(destination)]);
    return sourceContent.equals(destinationContent);
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export { repositoryConfigRelativePath };
