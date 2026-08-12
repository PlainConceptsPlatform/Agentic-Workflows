# Agentic Workflows

Source repository for Platform GitHub agentic workflows and the `@plainconceptsplatform/workflows` CLI.

## Layout

- `loops/`: copyable workflow source, arranged like a consumer `.github/`: `actions/` for composite actions, `aw/` for Agentic Workflows support, `workflows/` for workers, shared imports, and router, and `scripts/` for compilation.
- `cli/`: TypeScript installer and updater.
- `docs/`: ownership and consumer guidance.
- `skills/`: workflow-author and workflow-consumer skills.

Consumer repositories generate and commit their own `*.lock.yml` files. This repository does not store generated workflow locks.

## Consumer prerequisite

Before installing or compiling these workflows, consumer repositories should install and configure [`PlainConceptsPlatform/opencode-onboard`](https://github.com/PlainConceptsPlatform/opencode-onboard). Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available in the consumer repository before compiling.

For one-off CLI use:

```bash
npx @plainconceptsplatform/workflows@latest platform-workflows init
npx @plainconceptsplatform/workflows@latest platform-workflows add
npx @plainconceptsplatform/workflows@latest platform-workflows update
```

For a project-local development dependency, install `@plainconceptsplatform/workflows` and run `pnpm exec platform-workflows <init|add|update>`.
