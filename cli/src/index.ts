#!/usr/bin/env node

import { inspectRepository, parseVisibility, resolveVisibility } from "./repository-inspection.js";
import { installCatalog, installTemplate, isTemplateName } from "./catalog-installation.js";
import type { TemplateName } from "./workflow-catalog.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function run(arguments_: readonly string[], repositoryPath = process.cwd()): Promise<number> {
  const [command, ...options] = arguments_;

  if (command === "--help" || command === "-h" || command === undefined) {
    console.log("Usage: workflows <init|add|update|status> [--visibility public|private] [--template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo] [--force]");
    return 0;
  }

  if (command === "init") {
    const visibility = readVisibilityOption(options);
    if (visibility === "invalid") return fail("--visibility must be public or private.");
    const inspection = await inspectRepository(repositoryPath);
    const resolvedVisibility = await resolveVisibility(repositoryPath, visibility);
    console.log(JSON.stringify({ command, inspection, visibility: resolvedVisibility }, null, 2));
    return 0;
  }

  if (command === "status") {
    const inspection = await inspectRepository(repositoryPath);
    console.log(JSON.stringify({ command, inspection }, null, 2));
    return 0;
  }

  if (command === "add" || command === "update") {
    const template = readTemplateOption(options);
    if (template === "invalid") return fail(`${command} accepts only --force or --template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo.`);
    const force = options.includes("--force");
    const result = template === undefined
      ? await installCatalog(repositoryPath, { force })
      : await installTemplate(repositoryPath, template, { force });
    if (result.conflicts.length > 0 && !force) {
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

function readTemplateOption(options: readonly string[]): "invalid" | TemplateName | undefined {
  const templateIndex = options.indexOf("--template");
  if (templateIndex === -1) return options.every((option) => option === "--force") ? undefined : "invalid";
  if (templateIndex + 1 >= options.length || options.filter((option) => option === "--template").length !== 1) return "invalid";
  if (options.some((option, index) => option !== "--force" && index !== templateIndex && index !== templateIndex + 1)) return "invalid";
  return templateNameFromOptions(options[templateIndex + 1]);
}

function templateNameFromOptions(value: string | undefined): "invalid" | TemplateName {
  return value !== undefined && isTemplateName(value) ? value : "invalid";
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
