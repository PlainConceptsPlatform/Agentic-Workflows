import { spawnSync } from "node:child_process";

const compile = spawnSync("gh", ["aw", "compile", "--strict", "--dir", "loops"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (compile.error?.code === "ENOENT" || compile.status === null) {
  process.stderr.write("Could not run `gh aw compile`. Install githubnext/gh-aw first.\n");
  process.exit(1);
}

process.exit(compile.status ?? 1);
