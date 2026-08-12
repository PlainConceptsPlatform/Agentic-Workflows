# Agent guide

## Scope

- This repository provides reusable GitHub Actions workflow loops and an optional CLI.
- Consumer repositories own their `.github/` configuration. Treat this repository's `loops/` content as the equivalent workflow source.
- Workers are standalone and copyable. Consumer-specific values belong in each worker's top-level `env:` frontmatter, never in a shared repository configuration file.
- Do not edit consumer repository configuration from here unless the task explicitly targets that repository.

## Workflow and CLI work

- Before changing a workflow loop, load the intended author skill at `skills/workflow-author/SKILL.md`.
- Before configuring or consuming a loop, load the intended consumer skill at `skills/workflow-consumer/SKILL.md`.
- Before changing CLI behavior, load the intended CLI skill at `skills/cli/SKILL.md`.

## Consumer prerequisite

- Consumer repositories must install and configure `PlainConceptsPlatform/opencode-onboard` before using or compiling loops. Loop workers invoke the skills and commands it provides.
- Before compilation, verify the required `opencode-onboard` skills and commands are available in the consumer repository.
- For one-off consumer CLI use, recommend `npx @plainconceptsplatform/workflows@latest <init|add|update>`.
- `pnpm exec workflows <init|add|update>` is optional only when `@plainconceptsplatform/workflows` is installed as a project-local development dependency.

## Generated files

- Keep generated lock files out of this repository.
- Do not add or update generated locks unless a task explicitly changes this policy.
