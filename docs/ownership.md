# Workflow ownership

The package owns route definitions, workers, composite actions, router assembly, and workflow compilation support in `loops/`. `loops/actions/` holds composite actions, `loops/workflows/` holds workers, shared imports, and router, and `loops/scripts/` holds compilation support.

Workers are standalone copyable source files. Each worker owns every workflow-level environment value it needs in top-level `env:` frontmatter. Shared imports may provide shared behavior, but must not hide per-worker configuration.

Consumers manually edit copied worker frontmatter when their repository needs different:

- repository visibility and trusted bot actors;
- CI workflow name and eligible branch patterns;
- enabled routes and their schedules;
- stack setup, required network domains, and OpenCode configuration;
- verification commands, repository rules, and model endpoint defaults shown to agents.

Each worker declares `OPENAI_BASE_URL: https://forge.plainconcepts.com/v1` by default. Consumers update that worker-local value to declare a compatible endpoint. OpenCode workers retain their engine endpoint because `gh aw` routes them through its runtime proxy.

Generated `*.lock.yml` files and `.github/aw/actions-lock.json` belong only in consumer repositories. Consumers regenerate them with supplied compile script.

## Consumer prerequisite

Before installing or compiling workflows, consumers should install and configure `PlainConceptsPlatform/opencode-onboard`. Loop workers invoke the skills and commands it provides. Verify the required skills and commands are available in the consumer repository before compiling.

For one-off use, run `npx --yes --package @plainconceptsplatform/workflows@latest platform-workflows <init|add|update>`. Use `pnpm exec platform-workflows <init|add|update>` only with a project-local `@plainconceptsplatform/workflows` development dependency.

Workers use generic Platform baseline wording and `pnpm verify` by default. Consumers replace these
worker-local values and prompt guidance when their repository needs different checks or rules.
