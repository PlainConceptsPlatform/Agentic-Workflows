import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const workflowDirectory = existsSync("loops/workflows") ? "loops/workflows" : ".github/workflows";
const compile = spawnSync("gh", ["aw", "compile", "--strict", "--dir", workflowDirectory], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (compile.error?.code === "ENOENT" || compile.status === null) {
  process.stderr.write("Could not run `gh aw compile`. Install githubnext/gh-aw first.\n");
  process.exit(1);
}

process.exit(compile.status ?? 1);
