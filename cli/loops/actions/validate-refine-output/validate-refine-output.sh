#!/usr/bin/env bash
# Managed by @plainconceptsplatform/workflows. Source: loops/actions/validate-refine-output/validate-refine-output.sh. Update with `platform-workflows update --force`; consumer edits may be overwritten.
# Print the deterministic Refine outcome: complete, questions, or invalid.

set -euo pipefail

output_file="$1"
marker="$2"
comment_prefix="$3"
issue_number="$4"

if [ ! -f "$output_file" ] || ! jq -e '.items | arrays' "$output_file" >/dev/null 2>&1; then
  echo invalid
  exit 0
fi

jq -r --arg marker "$marker" --arg prefix "$comment_prefix" --arg issue "$issue_number" '
  def has_replacement_body:
    any(.items[]; .type == "update_issue" and
      (.item_number == null or (.item_number | tostring) == $issue) and
      (.body | type == "string") and (.body | test("[^[:space:]]")));

  def has_update:
    any(.items[]; .type == "update_issue");

  def has_only_source_items:
    all(.items[];
      (
        .type == "update_issue" and
        (.item_number == null or (.item_number | tostring) == $issue)
      ) or
      (
        .type == "add_comment" and
        (.item_number | tostring) == $issue
      ));

  def has_clarification:
    any(.items[]; .type == "add_comment" and (.item_number | tostring) == $issue and
      (.body | type == "string") and
      (.body | split($marker) | join("") | split($prefix) | join("") |
        gsub("<[^>]*>"; "") | test("[[:alnum:]]")));

  if has_replacement_body and has_only_source_items then "complete"
  elif has_clarification and (has_update | not) and has_only_source_items then "questions"
  else "invalid"
  end
' "$output_file"
