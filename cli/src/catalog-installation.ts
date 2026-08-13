import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { catalogTemplates, mandatoryFiles, routeNames, templateNames, workflowRoutes, type CatalogTemplate, type RouteName, type TemplateName } from "./workflow-catalog.js";
import { processRoutes, excludedWorkerFiles } from "./route-processing.js";
import { generateOpencodeCi, generateOpencodeConfig, generateStackDefaults, injectStackEnv, type StackDefaults } from "./stack-defaults.js";
import type { RepositoryInspection } from "./repository-inspection.js";

const execFileAsync = promisify(execFile);

export interface CatalogInstallResult {
  readonly installed: readonly string[];
  readonly conflicts: readonly string[];
}

export interface CatalogInstallOptions {
  readonly force?: boolean;
  readonly sourcePath?: string;
  readonly selectedRoutes?: readonly RouteName[];
  readonly inspection?: RepositoryInspection;
}

interface CatalogFile {
  readonly source: string;
  readonly target: string;
  readonly managed: boolean;
}

const sourceMappings = [
  ["actions", ".github/actions"],
  ["workflows", ".github/workflows"],
  ["scripts", "scripts"],
] as const;

export function mandatoryFileSpecs(sourcePath: string): CatalogFile[] {
  return mandatoryFiles.map((spec) => ({
    source: join(sourcePath, spec.source),
    target: spec.target,
    managed: true,
  }));
}

export function catalogSourcePath(modulePath = fileURLToPath(import.meta.url)): string {
  return resolve(dirname(modulePath), "..", "loops");
}

export async function installCatalog(
  repositoryPath: string,
  options: CatalogInstallOptions = {},
): Promise<CatalogInstallResult> {
  const sourcePath = options.sourcePath ?? catalogSourcePath();
  const selectedRoutes = options.selectedRoutes ?? routeNames;
  const allFiles = [...await catalogFiles(sourcePath), ...mandatoryFileSpecs(sourcePath)];
  const deduplicated = allFiles.filter((file, index) =>
    allFiles.findIndex((f) => f.target === file.target) === index,
  ).sort((left, right) => left.target.localeCompare(right.target));

  const excluded = excludedWorkerFiles(selectedRoutes);
  const filtered = deduplicated.filter((file) => {
    const fileName = file.target.split("/").pop() ?? "";
    return !excluded.has(fileName);
  });

  const managedFiles = filtered.filter((file) => file.managed);
  const conflicts = (await Promise.all(managedFiles.map(async (file) => {
    const destination = join(repositoryPath, file.target);
    return await exists(destination) && !(await filesMatch(file.source, destination)) ? file.target : undefined;
  }))).filter((file): file is string => file !== undefined);

  if (conflicts.length > 0 && !options.force) return { installed: [], conflicts };

  const fileContents = new Map<string, string>();
  for (const file of filtered) {
    fileContents.set(file.target, await readFile(file.source, "utf8"));
  }

  let processedContents = processRoutes(fileContents, selectedRoutes);

  if (options.inspection !== undefined) {
    const defaults = generateStackDefaults(options.inspection);
    processedContents = injectStackIntoWorkers(processedContents, defaults);
    processedContents = transformOpencodeFiles(processedContents, options.inspection);
  }

  await Promise.all([...processedContents.entries()].map(async ([target, content]) => {
    const destination = join(repositoryPath, target);
    const originalFile = filtered.find((f) => f.target === target);
    if (originalFile !== undefined && !originalFile.managed && await exists(destination)) return;
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }));

  await ensurePreCommitHook(repositoryPath);

  try {
    await runCompileIfAvailable(repositoryPath);
  } catch {
    // compile failure is non-fatal
  }

  return { installed: [...processedContents.keys()].sort(), conflicts };
}

function injectStackIntoWorkers(files: Map<string, string>, defaults: StackDefaults): Map<string, string> {
  const result = new Map(files);
  for (const [key, content] of result) {
    if (key.startsWith(".github/workflows/agent-") && key.endsWith(".md")) {
      result.set(key, injectStackEnv(content, defaults));
    }
  }
  return result;
}

function transformOpencodeFiles(files: Map<string, string>, inspection: RepositoryInspection): Map<string, string> {
  const result = new Map(files);
  for (const [key, content] of result) {
    if (key.endsWith("opencode-ci.md")) {
      result.set(key, generateOpencodeCi(content, inspection));
    } else if (key === "opencode.ci.json") {
      result.set(key, generateOpencodeConfig(content, inspection));
    }
  }
  return result;
}

export async function installTemplate(
  repositoryPath: string,
  template: TemplateName,
  options: CatalogInstallOptions = {},
): Promise<CatalogInstallResult> {
  const sourcePath = options.sourcePath ?? catalogSourcePath();
  const meta = catalogTemplateMeta(template);
  const source = join(sourcePath, "templates", meta.directory, meta.file);
  const target = meta.target;
  const destination = join(repositoryPath, target);
  const conflicts = await exists(destination) && !(await filesMatch(source, destination)) ? [target] : [];

  if (conflicts.length > 0 && !options.force) return { installed: [], conflicts };

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);

  if (options.inspection !== undefined && template === "opencode.ci.json") {
    const baseContent = await readFile(source, "utf8");
    const transformed = generateOpencodeConfig(baseContent, options.inspection);
    await writeFile(destination, transformed, "utf8");
  }

  try {
    await runCompileIfAvailable(repositoryPath);
  } catch {
    // compile failure is non-fatal
  }

  return { installed: [target], conflicts };
}

export async function installMandatoryFiles(
  repositoryPath: string,
  options: CatalogInstallOptions = {},
): Promise<CatalogInstallResult> {
  const sourcePath = options.sourcePath ?? catalogSourcePath();
  const files = mandatoryFileSpecs(sourcePath).sort((left, right) => left.target.localeCompare(right.target));
  const conflicts = (await Promise.all(files.map(async (file) => {
    const destination = join(repositoryPath, file.target);
    return await exists(destination) && !(await filesMatch(file.source, destination)) ? file.target : undefined;
  }))).filter((file): file is string => file !== undefined);

  if (conflicts.length > 0 && !options.force) return { installed: [], conflicts };

  await Promise.all(files.map(async (file) => {
    const destination = join(repositoryPath, file.target);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(file.source, destination);
  }));

  return { installed: files.map((file) => file.target), conflicts };
}

export function isTemplateName(value: string): value is TemplateName {
  return templateNames.includes(value as TemplateName);
}

export async function ensurePreCommitHook(repositoryPath: string): Promise<void> {
  const hookPath = join(repositoryPath, ".husky", "pre-commit");
  const compileLine = "node scripts/compile-agent-workflows.mjs";
  if (!await exists(hookPath)) {
    await mkdir(dirname(hookPath), { recursive: true });
    await writeFile(hookPath, `${compileLine}\n`, "utf8");
    return;
  }

  const content = await readFile(hookPath, "utf8");
  if (content.includes("compile-agent-workflows")) return;

  const newContent = content.endsWith("\n") || content === ""
    ? `${content}${compileLine}\n`
    : `${content}\n${compileLine}\n`;
  await writeFile(hookPath, newContent, "utf8");
}

export async function runCompileIfAvailable(repositoryPath: string): Promise<void> {
  const script = join(repositoryPath, "scripts", "compile-agent-workflows.mjs");
  if (await exists(script)) {
    await execFileAsync("node", [script, "--force"], { cwd: repositoryPath });
  }
}

function catalogTemplateMeta(template: TemplateName): { directory: string; file: string; target: string } {
  const entry = catalogTemplates.find((item) => item.name === template);
  if (entry === undefined) throw new Error(`Unknown template: ${template}`);
  const directory = template.startsWith("opencode") ? "opencode" : template.startsWith("app-ci-") ? "ci" : template === "github-release" ? "release" : "agentics";
  const isWorkflow = entry.file.endsWith(".yml");
  const target = template === "app-ci-dotnet-next"
    ? ".github/workflows/app-ci.yml"
    : isWorkflow ? `.github/workflows/${entry.file}` : entry.file;
  return { directory, file: entry.file, target };
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

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
