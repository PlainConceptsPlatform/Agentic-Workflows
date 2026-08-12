---
# Managed by @plainconceptsplatform/workflows. Source: loops/workflows/agent-merge-gate.md. Update with `workflows update --force`; consumer edits may be overwritten.
env:
  REPO_RULES: "Make a risk-based merge decision for the selected bot pull request. Merge only when CI is green and no risk indicators are present. Flag security, schema, auth, or calculation changes for human review. Do not merge protected file changes."
  OPENAI_BASE_URL: https://forge.plainconcepts.com/v1
  WORKING_LABEL: bot-working
  IMPLEMENT_LABEL: implement
  REVIEW_LABEL: review
  GATE_MARKER: "<!-- agent-merge-gate -->"
  INCOMPLETE_COMMENT: "Automated CI failure remediation ended without an outcome. The issue remains for a retry."
  ISSUE_CONTEXT_PATH: /tmp/gh-aw/agent/issue-context.json
  GIT_AUTHOR_NAME: "github-actions[bot]"
  GIT_AUTHOR_EMAIL: "github-actions[bot]@users.noreply.github.com"
  GIT_COMMITTER_NAME: "github-actions[bot]"
  GIT_COMMITTER_EMAIL: "github-actions[bot]@users.noreply.github.com"
description: |
  Decides what happens to a bot-authored pull request once CI has reported: merge when the
  risk assessment is clean, hand to a human when it is not, fix CI when it failed. Called by
  the Work Router; does not trigger on public events.

  The router supplies the CI conclusion and run ID as facts, so there is no polling and no
  timeout branch. The conclusion is read from the inputs instead of filtered at the trigger.

name: "Agent: Merge Gate"

# Router-only worker. The Work Router owns triggers, classification, and rung 1-2 checks.
# This workflow receives the classified inputs and runs rung 3+.
imports:
  - shared/platform-defaults.md
  - shared/opencode-ci.md

on:
  workflow_call:
    inputs:
      pr-number:
        description: Pull request number to gate.
        required: true
        type: string
      linked-issue:
        description: Issue number the pull request closes. May be empty.
        required: false
        type: string
      ci-conclusion:
        description: CI conclusion (success, failure, action_required, cancelled, etc.).
        required: true
        type: string
      ci-run-id:
        description: CI workflow run ID for fetching failing logs.
        required: false
        type: string

# Rung 4. Router has classified the event; identify-gate-subject validates PR ownership,
# resolves the closing issue, and confirms the CI verdict.
# A custom job, not `on.steps`, because the prompt and the precompute step need these
# values and `on.steps` outputs do not reach the agent job.
jobs:
  subject:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
      actions: read
    outputs:
      found: ${{ steps.subject.outputs.found }}
      pr: ${{ steps.subject.outputs.pr }}
      issue: ${{ steps.subject.outputs.issue }}
      conclusion: ${{ steps.subject.outputs.conclusion }}
    steps:
      - name: Checkout workflow actions
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Identify the pull request, its issue, and the CI verdict
        id: subject
        uses: ./.github/actions/identify-gate-subject
        with:
          token: ${{ github.token }}
          pr-number: ${{ inputs.pr-number }}
          ci-conclusion: ${{ inputs.ci-conclusion }}
          linked-issue: ${{ inputs.linked-issue }}
          require-label: ${{ env.IMPLEMENT_LABEL }}

  protected_changes:
    needs: subject
    if: needs.subject.outputs.found == 'true'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    outputs:
      requires_review: ${{ steps.files.outputs.requires_review }}
      files: ${{ steps.files.outputs.files }}
    steps:
      - name: Require review for protected pull request files
        id: files
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          PR: ${{ needs.subject.outputs.pr }}
        run: |
          set -euo pipefail
          files=$(gh api --paginate "repos/$REPO/pulls/$PR/files?per_page=100" --jq '.[].filename')
          protected=$(printf '%s\n' "$files" | grep -E '^(\.|AGENTS\.md$|ARCHITECTURE\.md$|DESIGN\.md$|opencode\.jsonc$|package\.json$|pnpm-lock\.yaml$|Directory\.Packages\.props$|global\.json$)' || true)

          if [ -n "$protected" ]; then
            echo "requires_review=true" >> "$GITHUB_OUTPUT"
            {
              echo 'files<<EOF'
              printf '%s\n' "$protected"
              echo EOF
            } >> "$GITHUB_OUTPUT"
          else
            echo "requires_review=false" >> "$GITHUB_OUTPUT"
            echo "files=" >> "$GITHUB_OUTPUT"
          fi

  review_required:
    needs: [subject, protected_changes]
    if: needs.subject.outputs.found == 'true' && needs.protected_changes.outputs.requires_review == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - name: Checkout workflow actions
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Create bot token
        id: app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          client-id: ${{ secrets.BOT_APP_ID }}
          private-key: ${{ secrets.BOT_PRIVATE_KEY }}
      - name: Release the issue
        uses: ./.github/actions/remove-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.WORKING_LABEL }}
      - name: Flag human review
        uses: ./.github/actions/add-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.REVIEW_LABEL }}
      - name: Explain the merge hold
        uses: ./.github/actions/create-issue-comment
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          body: |
            ${{ env.GATE_MARKER }}
            PR #${{ needs.subject.outputs.pr }} changes protected files and cannot be auto-merged.
            Review the pull request before merging it manually.

            Protected files:
            ${{ needs.protected_changes.outputs.files }}

  reserve:
    needs: subject
    if: needs.subject.outputs.found == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - name: Checkout workflow actions
        if: needs.subject.outputs.conclusion == 'failure'
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Create bot token
        if: needs.subject.outputs.conclusion == 'failure'
        id: app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          client-id: ${{ secrets.BOT_APP_ID }}
          private-key: ${{ secrets.BOT_PRIVATE_KEY }}
      - name: Mark the failed implementation issue as in progress
        if: needs.subject.outputs.conclusion == 'failure'
        uses: ./.github/actions/add-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.WORKING_LABEL }}
      - name: Clear the human-needed flag
        if: needs.subject.outputs.conclusion == 'failure'
        uses: ./.github/actions/remove-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.REVIEW_LABEL }}
  conclude:
    needs: [activation, subject, protected_changes, agent, safe_outputs]
    if: >
      needs.agent.result == 'success' &&
      needs.safe_outputs.result == 'success' &&
      needs.protected_changes.outputs.requires_review != 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - name: Create bot token
        id: app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          client-id: ${{ secrets.BOT_APP_ID }}
          private-key: ${{ secrets.BOT_PRIVATE_KEY }}
      - name: Checkout repository
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          token: ${{ steps.app-token.outputs.token }}
          fetch-depth: 0
      - name: Verify pull request closes the source issue
        continue-on-error: true
        uses: ./.github/actions/link-pr-to-issue
        with:
          token: ${{ steps.app-token.outputs.token }}
          pr-number: ${{ needs.subject.outputs.pr }}
          issue-number: ${{ needs.subject.outputs.issue }}
      - name: Apply agent output
        uses: ./.github/actions/apply-agent-output
        with:
          artifact-name: ${{ needs.activation.outputs.artifact_prefix }}agent
          token: ${{ steps.app-token.outputs.token }}
          merge-pull-request: 'true'
          push-to-branch: 'true'
          close-issues: 'true'
  incomplete:
    needs: [subject, protected_changes, agent, safe_outputs]
    if: >
      always() &&
      needs.subject.outputs.found == 'true' &&
      needs.protected_changes.outputs.requires_review != 'true' &&
      needs.agent.result != 'success'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - name: Checkout workflow actions
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Create bot token
        id: app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          client-id: ${{ secrets.BOT_APP_ID }}
          private-key: ${{ secrets.BOT_PRIVATE_KEY }}
      - name: Release the issue
        uses: ./.github/actions/remove-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.WORKING_LABEL }}
      - name: Flag for human review
        uses: ./.github/actions/add-issue-labels
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          labels: ${{ env.REVIEW_LABEL }}
      - name: Report missing remediation outcome
        uses: ./.github/actions/create-issue-comment
        with:
          token: ${{ steps.app-token.outputs.token }}
          issue-number: ${{ needs.subject.outputs.issue }}
          body: |
            ${{ env.GATE_MARKER }}
            ${{ env.INCOMPLETE_COMMENT }}
            [View this workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})

  agent:
    needs: protected_changes
    if: needs.protected_changes.outputs.requires_review != 'true'

if: needs.subject.outputs.found == 'true' && needs.protected_changes.outputs.requires_review != 'true'

runs-on: ubuntu-latest
runs-on-slim: ubuntu-latest

secrets:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

engine:
  id: opencode
  version: "1.2.14"
  env:
    OPENAI_BASE_URL: ${{ env.OPENAI_BASE_URL }}

model: openai/glm-5-2

max-turns: 300
max-turn-cache-misses: 3000
max-ai-credits: 5000

permissions: read-all

# push-to-pull-request-branch with target "*" cannot reach a branch the shallow clone
# does not have.
checkout:
  fetch: ["*"]
  fetch-depth: 0

# Rung 3. The diff is what the risk assessment reads, and the failing logs are what a fix
# starts from. Both are known from the inputs, so neither costs the agent a turn.
steps:
  - name: Load the issue context
    uses: ./.github/actions/load-issue-context
    with:
      token: ${{ github.token }}
      issue-number: ${{ needs.subject.outputs.issue }}
      output-path: ${{ env.ISSUE_CONTEXT_PATH }}
  - name: Fetch the diff and any failing job logs
    env:
      GH_TOKEN: ${{ github.token }}
      REPO: ${{ github.repository }}
      PR: ${{ needs.subject.outputs.pr }}
      RUN_ID: ${{ inputs.ci-run-id }}
      CONCLUSION: ${{ needs.subject.outputs.conclusion }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent
      gh pr diff "$PR" --repo "$REPO" > /tmp/gh-aw/agent/diff.patch
      gh pr view "$PR" --repo "$REPO" --json title,body,files,additions,deletions \
        > /tmp/gh-aw/agent/pr.json
      if [ "$CONCLUSION" = "failure" ]; then
        gh run view "$RUN_ID" --repo "$REPO" --log-failed \
          > /tmp/gh-aw/agent/failed-logs.txt 2>/dev/null || \
          echo "logs unavailable" > /tmp/gh-aw/agent/failed-logs.txt
        gh run view "$RUN_ID" --repo "$REPO" --json jobs \
          --jq '[.jobs[] | select(.conclusion == "failure") | {name, conclusion}]' \
          > /tmp/gh-aw/agent/failed-jobs.json
      fi

safe-outputs:
  staged: true
  threat-detection: false
  merge-pull-request:
  push-to-pull-request-branch:
  close-issue:
  add-comment:
  add-labels:
  remove-labels:

timeout-minutes: 60
---

1. You are gating pull request **#${{ needs.subject.outputs.pr }}**, which closes issue
   **#${{ needs.subject.outputs.issue }}**. CI concluded
   **${{ needs.subject.outputs.conclusion }}**.

   It has already been confirmed that this is an open pull request we authored, that it closes
   an issue, and that the issue carries `implement`. Do not re-check any of that, and do not
   poll for checks: the conclusion above is the answer.

2. Read `${{ env.ISSUE_CONTEXT_PATH }}`. It contains the issue body and its discussion. When
   running `/repo-verify`, the acceptance criteria there define what the implementation must
   satisfy.

3. Branch on the conclusion.

   - **success** → step 4.
   - **action_required** → CI did not run because the workflow needs approval.
     Call `remove_labels` to remove `bot-working` (item_number:
     ${{ needs.subject.outputs.issue }}), then `add_labels` to add `review`
     (item_number: ${{ needs.subject.outputs.issue }}), and `add_comment`
     (item_number: ${{ needs.subject.outputs.issue }}) saying CI requires
     workflow approval before it can run, and a maintainer must approve the
     pending run. Then stop , do not attempt to merge or fix.
   - **failure** → step 7.
   - **cancelled, timed_out, or anything else** → call `add_comment` with
     `item_number: ${{ needs.subject.outputs.issue }}` saying CI did not produce a verdict,
     then `add_labels` to add `review` (item_number: the issue), and stop.
      A cancelled or unknown run is not evidence of anything.

     Follow repository documentation and established conventions when assessing or remediating
     the pull request. Protect secrets, do not bypass checks, and keep remediation focused.
     Adhere to ${{ env.REPO_RULES }}.

4. Assess the risk of merging, as a reviewer would. Read `/tmp/gh-aw/agent/diff.patch` in full
   and `/tmp/gh-aw/agent/pr.json` for the shape of the change. Flag it as risky when any of
   these hold, and say which:

    - It touches authentication, authorization, secrets, credentials, or security boundaries.
    - It changes a repository-defined integration or cross-platform boundary.
   - It changes a public API or a published package's contract.
   - It deletes or weakens a test, or lowers a threshold.
    - It changes CI, CD or a workflow file.
   - It changes a protected file. This is normally handled before you run, but never merge one
     if it reaches this gate.
   - The diff is materially larger than the issue implied.
   - You are simply not confident. Low confidence is itself a flag.

5. **Clean assessment** → call `merge_pull_request` (pr_number:
   ${{ needs.subject.outputs.pr }}), then `close_issue` (item_number:
   ${{ needs.subject.outputs.issue }}), then `remove_labels` (item_number:
   ${{ needs.subject.outputs.issue }}) to remove `implement`, `bot-working`, and `review`.
   Call `add_comment` (item_number: ${{ needs.subject.outputs.issue }}):
   `Auto-merged. PR #${{ needs.subject.outputs.pr }} closed.`

6. **Flagged** → do not merge. Call `remove_labels` to remove `bot-working`
   (item_number: ${{ needs.subject.outputs.issue }}), then `add_labels` to add `review`
   (item_number: ${{ needs.subject.outputs.issue }}), and `add_comment`
   (item_number: ${{ needs.subject.outputs.issue }}) explaining exactly which criterion
   tripped and what a reviewer should look at. Then `add_comment`
   (item_number: ${{ needs.subject.outputs.pr }}) on the PR with the same message.
   Leave `implement` in place: the work is not finished until a human merges it.

 7. **CI failed** → read `/tmp/gh-aw/agent/failed-jobs.json` and
    `/tmp/gh-aw/agent/failed-logs.txt`, which are already on disk. Load only skills required to
    fix the actual cause. Run these verification commands before a push. Do not weaken a test,
    disable a check, or push an unverified guess.

     ```
     ${{ env.VERIFY_COMMANDS }}
     ```

   Call `push_to_pull_request_branch` (pr_number: ${{ needs.subject.outputs.pr }}) to push
   the fix, then `remove_labels` (item_number: ${{ needs.subject.outputs.issue }}) to remove
   `bot-working`. CI will run again and trigger you again with the new result.

   If you cannot fix it, or the logs show you have already tried on this same head commit,
   stop looping: `remove_labels` (item_number: ${{ needs.subject.outputs.issue }}) to remove
   `implement` and `bot-working`, `add_labels` (item_number:
   ${{ needs.subject.outputs.issue }}) to add `review`, and `add_comment` (item_number:
   ${{ needs.subject.outputs.issue }}) with the failure and what you tried. Per #167
   decision 2, a human decides from there.

8. Never merge with administrator privileges and never bypass a required check. If the merge
   is refused, that refusal is the answer: `add_labels` to add `review`
   (item_number: ${{ needs.subject.outputs.issue }}), `add_comment`
   (item_number: ${{ needs.subject.outputs.issue }}) with the refusal, and leave it for a human.

## Diagram

```mermaid
flowchart TD
    gateStart("Work Router<br/>merge-gate route<br/>(CI completed)") --> gateSubject
    gateSubject["Subject (rung 4)<br/>Our PR? Closes an implement issue?"] -->|✓| gateFacts
    gateSubject -.->|✗| gateIdle
    gateFacts("Facts (rung 3)<br/>Diff, PR shape, failing logs") --> gateCi
    gateCi["CI<br/>What did it conclude?"] -->|success| gateRisk
    gateCi -.->|failure| gateFix
    gateCi -.->|no verdict| gateHuman
    gateRisk["Risk<br/>Auth, schema, API, tests, CI, size, doubt"] -->|clean| gateMerge
    gateRisk -.->|flagged| gateHuman
    gateFix("Fix<br/>Read logs, fix the cause, /repo-verify") -->|pushed| gateWait
    gateFix -.->|cannot fix| gateHuman
    gateMerge(("Merged<br/>Issue closed, review+labels removed"))
    gateWait(("Pushed<br/>CI will re-run and re-trigger via Router"))
    gateHuman(("Review<br/>review label, reason explained"))
    gateIdle(("Idle<br/>Not our pull request"))

    classDef start fill:#ffffff,stroke:#172033,stroke-width:2px,color:#172033
    classDef action fill:#eef0ff,stroke:#554cff,stroke-width:2px,color:#172033
    classDef decision fill:#fff8e8,stroke:#c75b00,stroke-width:2px,color:#172033
    classDef idle fill:#202c40,stroke:#738198,stroke-width:2px,color:#ffffff
    classDef failure fill:#fff0f0,stroke:#ef2929,stroke-width:2px,color:#8b1a1a
    classDef success fill:#e8f8ec,stroke:#18883c,stroke-width:2px,color:#145a32
    class gateStart start
    class gateFacts,gateFix action
    class gateSubject,gateCi,gateRisk decision
    class gateIdle,gateWait idle
    class gateHuman failure
    class gateMerge success
```
