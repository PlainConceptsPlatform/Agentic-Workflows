# Compile, verify, and recover

Run `node scripts/compile-agent-workflows.mjs` after worker, router, shared mechanic, action, or template changes. Commit resulting worker `*.lock.yml` files and `.github/aw/actions-lock.json` in consumer repository.

Do not edit locks. Fix Markdown source or Actions source, recompile, then re-run repository checks. Inspect compiler warnings, caller input contracts, worker top-level environments, and generated job graph.

Before a package update, commit or stash consumer work. If update reports managed-file conflict, compare header source path with local edits and choose one: keep local consumer-owned fork, transplant change into source-compatible customization, or back up then run `update --force`. Compile immediately after any force update and review generated locks.

Verify a narrow real route event before relying on changed automation. Static compilation cannot catch an invalid reusable-workflow call, missing checkout for a local action, or an artifact write path that applies nothing.
