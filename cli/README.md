# Workflows CLI

Install and update shared GitHub Agentic Workflows for Plain Concepts Platform repositories.

## Install

Before installing workflows, install and configure [`PlainConceptsPlatform/opencode-onboard`](https://github.com/PlainConceptsPlatform/opencode-onboard) in the consumer repository. Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available before compiling workflows.

For one-off use, prefer:

```bash
npx @plainconceptsplatform/workflows@latest init
npx @plainconceptsplatform/workflows@latest add
npx @plainconceptsplatform/workflows@latest update
```

For a project-local development dependency:

```bash
pnpm add -D @plainconceptsplatform/workflows
pnpm exec workflows init
pnpm exec workflows add
```

`init` inspects the repository and reports its stack and visibility. It does not create or manage repository configuration or a manifest.

`add` installs package-owned files. It stops when a managed file differs. Use `pnpm exec workflows update --force` only when you intend to replace managed workflow files.

Install optional standalone templates with `add --template`. Available templates are `agentics-checks`, `agentics-maintenance`, `app-ci-dotnet-next`, and `app-ci-node-monorepo`. CI templates are stack-specific copies, not a combined template. Edit their top-level `env:` values for repository paths, package names, and commands.

## List and search

List all available workflows, routes, and templates with install status:

```bash
npx --yes --package @plainconceptsplatform/workflows@latest workflows list
```

Each entry is marked `[x]` when the corresponding `.github/workflows/agent-*.md` file already exists in the current directory, or `[ ]` when it is not yet installed.

Search by name or description:

```bash
npx --yes --package @plainconceptsplatform/workflows@latest workflows search "ci"
```

## Manual installation

The package includes `loops/`, a copyable equivalent of `.github/`:

- `loops/actions/` maps to `.github/actions/`
- `loops/workflows/` maps to `.github/workflows/`
- `loops/scripts/` maps to `scripts/`

Copy these files manually if you do not use the CLI. Each worker is self-contained. Edit its
top-level `env:` defaults directly for consumer-specific endpoint, model, labels, paths, and checks.

## Compile

Consumer repositories generate and commit `*.lock.yml` files:

```bash
node scripts/compile-agent-workflows.mjs --force
```

Do not commit generated locks to this package source repository.
