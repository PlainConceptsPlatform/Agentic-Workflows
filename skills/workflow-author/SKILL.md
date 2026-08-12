---
name: workflow-author
description: Author and validate reusable gh-aw workflow loops.
---

# Workflow author

Use for changes under `loops/`.

## Source layout

- `loops/workflows/`: router, workers, shared imports.
- `loops/actions/`: composite actions.
- `loops/aw/`: Agentic Workflows support and consumer config template.
- `loops/scripts/compile-agent-workflows.mjs`: strict compiler entry point.

## Authoring rules

- Loop workers invoke skills and commands supplied by `PlainConceptsPlatform/opencode-onboard`. Document it as a consumer prerequisite and require consumers to verify the required skills and commands are available before compiling.
- Keep router classification deterministic: one event yields one route or deterministic job. Router never runs a model.
- Add a route in router, classifier, worker contract, concurrency group, and route matrix together.
- Workers are router-only `workflow_call` targets. Keep inputs, outputs, permissions, and safe-output contracts explicit.
- Put workflow-wide environment defaults first in worker frontmatter under `env:`. Import consumer `shared/repo-config.md` for repository-specific values.
- Keep actions idempotent and inputs validated. Pin third-party actions by SHA. Never expose secrets in output, artifacts, prompts, or comments.
- Use `safe-outputs` for agent mutations. Workflow jobs own labels and cleanup.
- Preserve direct-route behavior: bot never removes `direct`; a human removes it. Human replies on a `direct` issue continue the conversation. Agents do not manage labels.
- Keep generated `*.lock.yml` and `actions-lock.json` out of this repository.

## Validate

Run `node loops/scripts/compile-agent-workflows.mjs`. Fix strict compiler failures in source, not generated output. Run relevant route and composite-action checks. Do not commit generated locks.
