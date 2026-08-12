# Agentic Workflows

Source repository for Platform GitHub agentic workflows and the `@plainconceptsplatform/workflows` CLI.

## Layout

- `loops/`: copyable workflow source, arranged like a consumer `.github/`: `actions/` for composite actions, `aw/` for Agentic Workflows support, `workflows/` for workers, shared imports, and router, and `scripts/` for compilation.
- `cli/`: TypeScript installer and updater.
- `docs/`: ownership and consumer guidance.
- `skills/`: workflow-author and workflow-consumer skills.

Consumer repositories generate and commit their own `*.lock.yml` files. This repository does not store generated workflow locks.
