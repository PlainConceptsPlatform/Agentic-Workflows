# Agent guide

## Scope

- This repository provides reusable GitHub Actions workflow loops and an optional CLI.
- Consumer repositories own their `.github/` configuration. Treat this repository's `loops/` content as the equivalent workflow source.
- Do not edit consumer repository configuration from here unless the task explicitly targets that repository.

## Workflow and CLI work

- Before changing a workflow loop, load the intended author skill at `skills/workflow-author/SKILL.md`.
- Before configuring or consuming a loop, load the intended consumer skill at `skills/workflow-consumer/SKILL.md`.
- Before changing CLI behavior, load the intended CLI skill at `skills/cli/SKILL.md`.
- These paths name planned skills. Their content is not yet available.

## Generated files

- Keep generated lock files out of this repository.
- Do not add or update generated locks unless a task explicitly changes this policy.
