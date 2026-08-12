---
name: workflow-consumer
description: Install, configure, compile, and safely update Agentic Workflow loops in a consumer repository.
---

# Workflow consumer

Use in a repository consuming this package. Do not use it to alter this repository's `loops/` source. This skill is self-contained.

## Before install

Install and configure `PlainConceptsPlatform/opencode-onboard` in consumer repository. Workers invoke skills and commands it provides. Before compilation, verify worker-required skills and commands exist locally.

Use one-off CLI invocation exactly as shown:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows init
npx --yes --package @plainconceptsplatform/workflows@latest workflows add
npx --yes --package @plainconceptsplatform/workflows@latest workflows update
```

For a project-local development dependency only, install package first and use:

```sh
pnpm exec workflows init
pnpm exec workflows add
pnpm exec workflows update
```

`init` inspects repository and visibility without writing workflow files. `add` installs managed loop files. `update` refreshes them.

## Select templates deliberately

Templates are optional and independent of managed loops. Add only template matching repository:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template agentics-checks
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template agentics-maintenance
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template app-ci-dotnet-next
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template app-ci-node-monorepo
```

Use `agentics-checks` to validate agentic sources and generated locks in pull requests. Use `agentics-maintenance` only when repository wants pre-generated gh-aw maintenance workflow. Select one CI template only when its technology and commands suit repository. Templates are copied to `.github/workflows/` and consumer-owned after installation.

## Customise standalone workers

Managed files include ownership headers and source paths. Read header before edits. `add` and `update` stop on changed managed files; inspect diff first. Use `--force` only when intentionally replacing a managed file. Back up or move consumer changes before force update.

There is no shared `repo-config` file. Every `agent-*.md` worker is standalone. After installation, edit that worker's top-level `env:` values directly for labels, paths, prompt rules, endpoint, model-related settings, and verification commands. Values have concrete defaults, including `OPENAI_BASE_URL: https://forge.plainconcepts.com/v1`. Keep worker-specific configuration in worker frontmatter; do not create a shared repository configuration layer.

Shared imports can carry mechanics, but worker frontmatter owns policy: environment defaults, permissions, engine, model, runners, Safe Outputs, and timeout. Preserve ownership headers unless deliberately making the file consumer-owned.

## Compile and verify

Compile in consumer repository:

```sh
node scripts/compile-agent-workflows.mjs
```

Commit generated `*.lock.yml` and `.github/aw/actions-lock.json` in consumer repository. They are generated consumer artifacts, not source package files. Run repository's agentic workflow checks and inspect compiler warnings. Confirm worker inputs match router calls, every worker has concrete top-level environment defaults, and no generated file has been hand-edited.

Read references as needed:

| File | Use for |
| --- | --- |
| `references/install.md` | Layout, commands, ownership, updates |
| `references/customize.md` | Worker environment and migration from shared configuration |
| `references/templates.md` | Optional template choice and tailoring |
| `references/compile.md` | Compilation, locks, verification, rollback |
