# Agentic Workflows

Source repository for Platform GitHub agentic workflows and the `@plainconceptsplatform/workflows` CLI.

## Layout

- `loops/`: standalone copyable workflow source, arranged like a consumer `.github/`: `actions/` for composite actions, `workflows/` for workers, shared imports, and router, and `scripts/` for compilation.
- `cli/`: TypeScript installer and updater.
- `docs/`: ownership and consumer guidance.
- `skills/`: workflow-author and workflow-consumer skills.

Consumer repositories generate and commit their own `*.lock.yml` files. This repository does not store generated workflow locks.

## Consumer prerequisite

Before installing or compiling these workflows, consumer repositories should install and configure [`PlainConceptsPlatform/opencode-onboard`](https://github.com/PlainConceptsPlatform/opencode-onboard). Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available in the consumer repository before compiling.

## Quick start

The primary entrypoint is the interactive TUI. Run it with no arguments:

```bash
npx @plainconceptsplatform/workflows
```

The TUI lists all routes and templates with install status. Use arrow keys to navigate, space to toggle, and Enter to install selected items. Selecting any route installs the full managed catalog (actions, workflows, router, compile script) plus the mandatory `opencode.ci.json` and `scripts/compile-agent-workflows.mjs`. Selecting only templates still installs those two mandatory files.

## Advanced (non-interactive) commands

For automation or scripting, non-interactive commands are available:

```bash
npx @plainconceptsplatform/workflows@latest init
npx @plainconceptsplatform/workflows@latest add
npx @plainconceptsplatform/workflows@latest add --template agentics-checks
npx @plainconceptsplatform/workflows@latest add --template agentics-maintenance
npx @plainconceptsplatform/workflows@latest add --template app-ci-dotnet-next
npx @plainconceptsplatform/workflows@latest add --template app-ci-node-monorepo
npx @plainconceptsplatform/workflows@latest update
```

`add` (catalog install) always installs `opencode.ci.json` and `scripts/compile-agent-workflows.mjs` alongside managed loop files. They are mandatory.

For a project-local development dependency, install `@plainconceptsplatform/workflows` and run `pnpm exec workflows` with no arguments to launch the TUI, or `pnpm exec workflows <init|add|update>` for non-interactive use.

Each worker declares its defaults in top-level `env:` frontmatter. Copy consumers edit those
values directly when their endpoint, model, labels, paths, or baseline verification command differs.
Every package-managed file includes an ownership header with its `loops/` source path. `update --force` can overwrite consumer edits to these files.

## Optional agentic maintenance templates

`add` and `update` install only package-owned loops. They do not install maintenance templates. Install a template explicitly with `add --template <name>`; use `--force` only to replace a changed copy.

- `agentics-checks` verifies generated lockfiles and lints agentic workflow source on pull requests.
- `github-release` publishes a GitHub Release with generated notes when a `v*` tag is pushed.
- `agentics-maintenance` is the `gh aw` generated maintenance workflow. It is supplied for repositories that want to commit the generated workflow before their first compilation.

Templates are standalone copies placed in `.github/workflows/`. `app-ci-dotnet-next` provides .NET, SQL Server integration testing, Next.js, and security checks. `app-ci-node-monorepo` provides Node monorepo, web, Electron, Capacitor, E2E, and security checks. `github-release` publishes generated GitHub release notes when a `v*` tag is pushed. `opencode.ci.json` is always installed as a mandatory file during catalog install; the `--template opencode.ci.json` command is an advanced option for installing it in isolation. Edit their top-level `env:` defaults or JSON properties after copying.
