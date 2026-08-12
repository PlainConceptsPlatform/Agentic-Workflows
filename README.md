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

For one-off CLI use:

```bash
npx @plainconceptsplatform/workflows@latest init
npx @plainconceptsplatform/workflows@latest add
npx @plainconceptsplatform/workflows@latest add --template agentics-checks
npx @plainconceptsplatform/workflows@latest add --template agentics-maintenance
npx @plainconceptsplatform/workflows@latest add --template app-ci-dotnet-next
npx @plainconceptsplatform/workflows@latest add --template app-ci-node-monorepo
npx @plainconceptsplatform/workflows@latest add --template opencode.ci.json
npx @plainconceptsplatform/workflows@latest update
```

For a project-local development dependency, install `@plainconceptsplatform/workflows` and run `pnpm exec workflows <init|add|update>`.

Each worker declares its defaults in top-level `env:` frontmatter. Copy consumers edit those
values directly when their endpoint, model, labels, paths, or baseline verification command differs.
Every package-managed file includes an ownership header with its `loops/` source path. `update --force` can overwrite consumer edits to these files.

## Optional agentic maintenance templates

`add` and `update` install only package-owned loops. They do not install maintenance templates. Install a template explicitly with `add --template <name>`; use `--force` only to replace a changed copy.

- `agentics-checks` verifies generated lockfiles and lints agentic workflow source on pull requests.
- `agentics-maintenance` is the `gh aw` generated maintenance workflow. It is supplied for repositories that want to commit the generated workflow before their first compilation.

Templates are standalone copies placed in `.github/workflows/`. `app-ci-dotnet-next` provides .NET, SQL Server integration testing, Next.js, and security checks. `app-ci-node-monorepo` provides Node monorepo, web, Electron, Capacitor, E2E, and security checks. `opencode.ci.json` provides a standalone OpenCode CI configuration with the `plainconcepts` provider, GLM model registration, `ci-workflow-agent`, and LSP defaults; it is placed at the repository root. Edit their top-level `env:` defaults or JSON properties after copying.
