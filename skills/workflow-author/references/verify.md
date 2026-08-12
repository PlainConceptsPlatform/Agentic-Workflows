# Verification and diagnosis

Run `node loops/scripts/compile-agent-workflows.mjs`. Fix source, never generated output. Also run affected route matrix, composite manifest verification, shell checks, and authored workflow linting.

Inspect compiled worker graph, real agent `if:`, declared caller inputs, and artifact name. Confirm every local action job checks out first. Confirm composite manifests do not contain `${{ needs.* }}`, `${{ jobs.* }}`, or `${{ secrets.* }}`.

Static checks miss reusable-workflow permission startup failures, missing checkouts, file modes, false guards, and swallowed artifact downloads. Trigger one safe real event or validation dispatch and inspect jobs and outputs.

Common symptoms:

| Symptom | Check |
| --- | --- |
| `startup_failure`, no jobs | Caller permissions, inputs, forbidden caller keys |
| Agent runs after guard rejects | Guard output absent from agent `if:` |
| `Can't find action.yml` | Missing checkout before local action |
| Exit 126 | Invoke shell through `bash` |
| Green run, no writes | Prefixed artifact name and terminal apply job |
| Agent timeout | Forge host missing from network policy |

Source repository policy: generated consumer locks and `actions-lock.json` stay untracked here.
