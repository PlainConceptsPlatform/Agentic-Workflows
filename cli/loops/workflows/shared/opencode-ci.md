---
# Managed by @plainconceptsplatform/workflows. Source: loops/workflows/shared/opencode-ci.md. Update with `platform-workflows update --force`; consumer edits may be overwritten.
env:
  AGENTMEMORY_VERSION: "0.9.28"
  CODEGRAPH_VERSION: "1.5.0"
  RTK_VERSION: "0.44.1"
  RTK_SHA256: "986f29704469b3d1051e2474105c6c75ab8b73651068dcd61612c1fb3938ad95"
description: Shared CI setup for Platform agent workflows.

pre-agent-steps:
  - name: Create agent scratch directory
    run: mkdir -p .opencode/.tmp
  - name: Activate the pnpm version package.json pins
    run: |
      set -euo pipefail
      corepack enable
      corepack prepare --activate
      pnpm --version
  - name: Cache the pnpm store
    uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
    with:
      path: ~/.local/share/pnpm/store
      key: pnpm-store-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
      restore-keys: pnpm-store-${{ runner.os }}-
  - name: Install workspace dependencies
    run: pnpm install --frozen-lockfile
---
