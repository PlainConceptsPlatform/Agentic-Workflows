#!/usr/bin/env node

import { inspectRepository, parseVisibility, resolveVisibility } from "./repository-inspection.js";
import { installCatalog, installTemplate, isTemplateName } from "./catalog-installation.js";
import { formatCatalog, listCatalog, searchCatalog } from "./catalog-listing.js";
import type { TemplateName } from "./workflow-catalog.js";
import { runInteractive } from "./tui.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HELP_TEXT = `Workflows CLI — install and manage Plain Concepts Platform agentic workflows.

Run with no arguments to launch the interactive TUI, the primary way to select and install
workflows and templates:

  npx @plainconceptsplatform/workflows

Advanced (non-interactive) commands:

Usage: workflows <command> [options]

Commands:
  (default)                                   Launch the interactive TUI for selecting and installing items.
  init                                        Inspect the repository and report its stack and visibility.
  add                                         Install package-owned workflow files into .github/.
  update                                      Alias for add. Use --force to overwrite managed files.
  status                                      Print repository inspection as JSON.
  list                                        List all available workflows and templates with install status.
  search <query>                              Filter workflows and templates by name or description.

Options:
  --visibility public|private                 Override repository visibility (init only).
  --template <name>                           Install a standalone template instead of the catalog.
                                              Templates: agentics-checks, agentics-maintenance,
                                              app-ci-dotnet-next, app-ci-node-monorepo,
                                              opencode.ci.json.
  --force                                     Overwrite managed files that differ from the package source.
  -h, --help                                  Show this help text.

Installed workflows are marked [x] when the corresponding .github/workflows/agent-*.md
file exists relative to the current directory.`;

export async function run(arguments_: readonly string[], repositoryPath = process.cwd()): Promise<number> {
  const [command, ...options] = arguments_;

  if (command === "--help" || command === "-h") {
    console.log(HELP_TEXT);
    return 0;
  }

  if (command === undefined) {
    const force = options.includes("--force");
    return runInteractive(repositoryPath, { force });
  }

  if (command === "list") {
    const entries = await listCatalog({ installedPath: repositoryPath });
    console.log(formatCatalog(entries));
    return 0;
  }

  if (command === "search") {
    if (options.length === 0 || options.length > 1) return fail("search requires exactly one query argument.");
    const allEntries = await listCatalog({ installedPath: repositoryPath });
    const results = searchCatalog(allEntries, options[0]);
    console.log(formatCatalog(results));
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
    if (template === "invalid") return fail(`${command} accepts only --force or --template agentics-checks|agentics-maintenance|app-ci-dotnet-next|app-ci-node-monorepo|opencode.ci.json.`);
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
