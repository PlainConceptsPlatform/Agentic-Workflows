#!/usr/bin/env bash
# Managed by @plainconceptsplatform/workflows. Source: loops/actions/validate-triage-output/validate-triage-output.sh. Update with `workflows update --force`; consumer edits may be overwritten.
# Print the deterministic triage outcome: pass, needs-info, block, or invalid.

set -euo pipefail

output_file="$1"
issue_number="$2"

if [ ! -f "$output_file" ] || ! jq -e '.items | arrays' "$output_file" >/dev/null 2>&1; then
  echo invalid
  exit 0
fi

# The agent emits exactly one add_comment on the source issue. The comment body
# must contain a verdict line matching **Verdict:** pass|needs-info|block.
# Anything else is invalid.
jq -r --arg issue "$issue_number" '
  def has_triage_comment:
    any(.items[]; .type == "add_comment" and
      (.item_number | tostring) == $issue and
      (.body | type == "string"));

  def extract_verdict:
    [.items[] | select(.type == "add_comment" and (.item_number | tostring) == $issue and (.body | type == "string"))]
    | map(.body | capture("\\*\\*Verdict:\\*\\*\\s*(pass|needs-info|block)"; "i") // empty)
    | .[0] // empty;

  if has_triage_comment then
    (extract_verdict | ascii_downcase) as $verdict |
    if $verdict == "pass" or $verdict == "needs-info" or $verdict == "block" then
      $verdict
    else
      "invalid"
    end
  else
    "invalid"
  end
' "$output_file"
