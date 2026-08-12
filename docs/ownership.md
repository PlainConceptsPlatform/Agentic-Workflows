# Workflow ownership

The package owns route definitions, workers, composite actions, router assembly, and workflow compilation support in `loops/`. `loops/actions/` holds composite actions, `loops/aw/` holds Agentic Workflows support, `loops/workflows/` holds workers, shared imports, and router, and `loops/scripts/` holds compilation support.

Each consumer owns `.github/workflows/shared/repo-config.md`. `loops/aw/repo-config.md` is its source template. The CLI creates it during initialization and preserves it during later installs and updates. It holds repository-specific setup, verification commands, network access, and agent prompt rules.

The consumer configuration must cover:

- repository visibility and trusted bot actors;
- CI workflow name and eligible branch patterns;
- enabled routes and their schedules;
- stack setup, required network domains, and OpenCode configuration;
- verification commands and repository rules shown to agents.

Generated `*.lock.yml` files and `.github/aw/actions-lock.json` belong only in consumer repositories. Consumers regenerate them with supplied compile script.

## Consumer prerequisite

Before installing or compiling workflows, consumers should install and configure `PlainConceptsPlatform/opencode-onboard`. Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available in the consumer repository before compiling.

For one-off use, run `npx @plainconceptsplatform/workflows@latest platform-workflows <init|add|update>`. Use `pnpm exec platform-workflows <init|add|update>` only with a project-local `@plainconceptsplatform/workflows` development dependency.

## Compiler proof

`gh aw compile --strict` v0.83.4 preserves environment entries imported from `repo-config.md` in the generated worker workflow. A worker prompt can therefore refer to `${{ env.VERIFY_COMMANDS }}` and `${{ env.REPO_RULES }}` without CLI text substitution.
