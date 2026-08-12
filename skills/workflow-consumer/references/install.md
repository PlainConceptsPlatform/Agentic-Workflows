# Install and update

Prerequisite: consumer repository installs and configures `PlainConceptsPlatform/opencode-onboard`, then verifies worker-required skills and commands before compilation.

One-off use:

```sh
npx --yes --package @plainconceptsplatform/workflows@latest workflows <init|add|update>
```

Project-local dependency use:

```sh
pnpm add -D @plainconceptsplatform/workflows
pnpm exec workflows <init|add|update>
```

Package-managed actions, worker sources, router, shared workflow mechanics, and compiler include ownership headers. Changed managed targets block `add` and `update`. Review the conflict; use `--force` only after preserving intended consumer changes. `update --force` may overwrite all managed target edits.

Managed loop mapping is `loops/actions/` to `.github/actions/`, `loops/workflows/` to `.github/workflows/`, and compiler to `scripts/compile-agent-workflows.mjs`.
