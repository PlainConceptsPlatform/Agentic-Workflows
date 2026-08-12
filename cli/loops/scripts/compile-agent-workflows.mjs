// Managed by @plainconceptsplatform/workflows. Source: loops/scripts/compile-agent-workflows.mjs. Update with `workflows update --force`; consumer edits may be overwritten.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const workflowDirectory = existsSync("loops/workflows") ? "loops/workflows" : ".github/workflows";

// On Windows, `gh` resolves to a shim that spawnSync cannot find without a shell.
// Resolve the full path via `where` so spawnSync works with shell: false (security-safe).
function resolveGhPath() {
  if (process.platform !== "win32") return "gh";
  const result = spawnSync("where", ["gh"], { encoding: "utf8", shell: false });
  if (result.status === 0) {
    const first = result.stdout.split("\n").map((s) => s.trim()).find(Boolean);
    if (first) return first;
  }
  return "gh";
}

const compile = spawnSync(resolveGhPath(), ["aw", "compile", "--strict", "--dir", workflowDirectory], {
  stdio: "inherit",
  shell: false,
});

if (compile.error?.code === "ENOENT" || compile.status === null) {
  process.stderr.write("Could not run `gh aw compile`. Install githubnext/gh-aw first.\n");
  process.exit(1);
}

process.exit(compile.status ?? 1);
