# Platform workflows

Install and update shared GitHub Agentic Workflows for Plain Concepts Platform repositories.

## Install

```bash
pnpm add -D @plainconceptsplatform/workflows
pnpm exec platform-workflows init
pnpm exec platform-workflows add
```

`init` detects the repository stack and visibility, creates `.github/workflows/shared/repo-config.md` when absent, and records managed workflow state. Complete the consumer configuration before compiling workflows.

`add` installs missing package-owned files. It stops when a managed file differs. Use `pnpm exec platform-workflows update --force` only when you intend to replace managed workflow files. It never overwrites `repo-config.md`.

## Manual installation

The package includes `loops/`, a copyable equivalent of `.github/`:

- `loops/actions/` maps to `.github/actions/`
- `loops/workflows/` maps to `.github/workflows/`
- `loops/aw/repo-config.md` maps to `.github/workflows/shared/repo-config.md`
- `loops/scripts/` maps to `scripts/`

Copy these files manually if you do not use the CLI. Keep `repo-config.md` consumer-owned.

## Compile

Consumer repositories generate and commit `*.lock.yml` files:

```bash
node scripts/compile-agent-workflows.mjs --force
```

Do not commit generated locks to this package source repository.
