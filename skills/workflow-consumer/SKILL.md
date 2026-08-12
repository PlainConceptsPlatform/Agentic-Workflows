---
name: workflow-consumer
description: Install, configure, and compile Agentic Workflows in a consumer repository.
---

# Workflow consumer

Use in consumer repositories, never to alter this source repository's loops.

## Install or update

Before installing workflows, install and configure `PlainConceptsPlatform/opencode-onboard` in the consumer repository. Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available before compiling workflows.

For one-off use, run:

```sh
npx @plainconceptsplatform/workflows@latest platform-workflows init
npx @plainconceptsplatform/workflows@latest platform-workflows add
npx @plainconceptsplatform/workflows@latest platform-workflows update
```

For a project-local development dependency, install it with `pnpm add -D @plainconceptsplatform/workflows`, then run:

```sh
pnpm exec platform-workflows init [--visibility public|private]
pnpm exec platform-workflows add
pnpm exec platform-workflows update
```

`add` and `update` stop on changed package-managed files. Inspect conflicts first; use `--force` only to intentionally replace package-owned files.

## Manual layout

Copy `loops/` as consumer `.github/` equivalents:

- `loops/actions/` to `.github/actions/`
- `loops/workflows/` to `.github/workflows/`
- `loops/scripts/compile-agent-workflows.mjs` to `scripts/`
- `loops/aw/repo-config.md` to `.github/workflows/shared/repo-config.md`, only when absent

Keep repository-specific configuration in `.github/workflows/shared/repo-config.md`. Do not overwrite it during manual copies, installation, or updates.

## Configure and compile

Set repository visibility, trusted actors, CI and branches, enabled routes and schedules, setup/network access, verification commands, and agent rules in repo config.

In consumer repository, run:

```sh
node scripts/compile-agent-workflows.mjs
```

Commit generated `*.lock.yml` files and `.github/aw/actions-lock.json` in consumer repository. They are generated consumer artifacts, never source-loop files.
