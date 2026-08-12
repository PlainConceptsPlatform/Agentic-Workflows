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
npx --yes --package @plainconceptsplatform/workflows@latest platform-workflows init
npx --yes --package @plainconceptsplatform/workflows@latest platform-workflows add
npx --yes --package @plainconceptsplatform/workflows@latest platform-workflows update
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

Each worker is standalone. Edit its top-level `env:` values directly after copying when the
consumer needs different endpoint, model, labels, paths, verification commands, or prompt rules.

## Configure and compile

Set repository visibility, trusted actors, CI and branches, enabled routes and schedules, setup/network access, verification commands, and agent rules in copied worker frontmatter and workflow source. Each worker's `OPENAI_BASE_URL` defaults to `https://forge.plainconcepts.com/v1`. OpenCode workers retain their engine endpoint because `gh aw` routes them through its runtime proxy.

In consumer repository, run:

```sh
node scripts/compile-agent-workflows.mjs
```

Commit generated `*.lock.yml` files and `.github/aw/actions-lock.json` in consumer repository. They are generated consumer artifacts, never source-loop files.
