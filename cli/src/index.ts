#!/usr/bin/env node

import { inspectRepository, parseVisibility, resolveVisibility } from "./repository-inspection.js";
import { installCatalog } from "./catalog-installation.js";
import { initializeRepository, readManifest, repositoryConfigRelativePath } from "./repository-state.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function run(arguments_: readonly string[], repositoryPath = process.cwd()): Promise<number> {
  const [command, ...options] = arguments_;

  if (command === "--help" || command === "-h" || command === undefined) {
    console.log("Usage: platform-workflows <init|add|update|status> [--visibility public|private] [--force]");
    return 0;
  }

  if (command === "init") {
    const visibility = readVisibilityOption(options);
    if (visibility === "invalid") return fail("--visibility must be public or private.");
    const inspection = await inspectRepository(repositoryPath);
    const resolvedVisibility = await resolveVisibility(repositoryPath, visibility);
    const result = await initializeRepository(inspection, resolvedVisibility);
    console.log(JSON.stringify({ command, ...result }, null, 2));
    return 0;
  }

  if (command === "status") {
    const inspection = await inspectRepository(repositoryPath);
    const manifest = await readManifest(repositoryPath);
    console.log(JSON.stringify({ command, inspection, manifest, repositoryConfigPath: repositoryConfigRelativePath }, null, 2));
    return 0;
  }

  if (command === "add" || command === "update") {
    if (options.some((option) => option !== "--force")) return fail(`${command} accepts only --force.`);
    const result = await installCatalog(repositoryPath, { force: options.includes("--force") });
    if (result.conflicts.length > 0 && !options.includes("--force")) {
      console.error(`Catalog conflicts found. Re-run with --force to overwrite package-managed files:\n${result.conflicts.join("\n")}`);
      return 1;
    }
    console.log(JSON.stringify({ command, ...result }, null, 2));
    return 0;
  }

  return fail(`Unknown command: ${command}`);
}

function readVisibilityOption(options: readonly string[]): "invalid" | "public" | "private" | undefined {
  if (options.length === 0) return undefined;
  if (options.length !== 2 || options[0] !== "--visibility") return "invalid";
  return parseVisibility(options[1]) ?? "invalid";
}

function fail(message: string): number {
  console.error(message);
  return 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void run(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
