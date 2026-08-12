---
name: workflow-consumer
description: >
  Install, configure, compile, and safely update Agentic Workflow loops in a consumer
  repository. Load when setting up the `workflows` CLI, adding managed worker files, selecting
  templates, customising worker environment, compiling lockfiles, or recovering from a package
  update.
---

# Workflow consumer

Use in a repository consuming this package. Do not use it to alter this repository's `loops/`
source. This skill is self-contained. Read reference files in `references/` within this folder only.

## Prerequisites

Install and configure `PlainConceptsPlatform/opencode-onboard` in the consumer repository first.
Workers invoke skills and commands it provides. Before compilation, verify worker-required skills and
commands exist locally.

## Install and update

The package bin name is `workflows`. Use one-off invocation exactly as shown:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows init
npx --yes --package @plainconceptsplatform/workflows@latest workflows add
npx --yes --package @plainconceptsplatform/workflows@latest workflows update
```

For a project-local development dependency, install the package first and use:

```sh
pnpm add -D @plainconceptsplatform/workflows
pnpm exec workflows init
pnpm exec workflows add
pnpm exec workflows update
```

`init` inspects the repository and its visibility without writing workflow files. `add` installs
managed loop files. `update` refreshes them.

Full install, layout, ownership header, and update conflict handling are in
`references/install.md`.

## Select templates deliberately

Templates are optional and independent of managed loops. Add only the template matching the
repository:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template agentics-checks
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template agentics-maintenance
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template app-ci-dotnet-next
npx --yes --package @plainconceptsplatform/workflows@latest workflows add --template app-ci-node-monorepo
```

Use `agentics-checks` to validate agentic sources and generated locks in pull requests. Use
`agentics-maintenance` only when the repository wants the pre-generated gh-aw maintenance workflow.
Select one CI template only when its technology and commands suit the repository. Templates are copied
to `.github/workflows/` and consumer-owned after installation.

Full template selection guidance is in `references/templates.md`.

## Customise standalone workers

Managed files include ownership headers and source paths. Read the header before editing. `add` and
`update` stop on changed managed files; inspect the diff first. Use `--force` only when intentionally
replacing a managed file. Back up or move consumer changes before force update.

There is no shared `repo-config` file. Every `agent-*.md` worker is standalone. After installation,
edit that worker's top-level `env:` values directly for labels, paths, prompt rules, endpoint,
model-related settings, and verification commands. Values have concrete defaults, including
`OPENAI_BASE_URL: https://forge.plainconcepts.com/v1`. Keep worker-specific configuration in worker
frontmatter; do not create a shared repository configuration layer.

Shared imports can carry mechanics, but worker frontmatter owns policy: environment defaults,
permissions, engine, model, runners, Safe Outputs, and timeout. Preserve ownership headers unless
deliberately making the file consumer-owned.

Full customization guidance, the migration path from shared configuration, and the values each worker
owns are in `references/customize.md`.

## Compile and verify

Compile in the consumer repository:

```sh
node scripts/compile-agent-workflows.mjs
```

Commit generated `*.lock.yml` and `.github/aw/actions-lock.json` in the consumer repository. They are
generated consumer artifacts, not source package files. Run the repository's agentic workflow checks
and inspect compiler warnings. Confirm worker inputs match router calls, every worker has concrete
top-level environment defaults, and no generated file has been hand-edited.

Full compilation, verification, rollback, and recovery guidance is in `references/compile.md`.

## References

Load these as needed; do not read all of them up front.

| File | Read it when |
|---|---|
| `references/install.md` | CLI commands, managed file layout, ownership headers, update conflicts |
| `references/customize.md` | Worker environment editing, values each worker owns, migration from shared config |
| `references/templates.md` | Optional template choice, what each template does, tailoring guidance |
| `references/compile.md` | Compilation, lockfiles, CI freshness check, rollback after a bad update |
