#!/usr/bin/env bash
# Managed by @plainconceptsplatform/workflows. Source: loops/actions/classify-route/classify-route.sh. Update with `platform-workflows update --force`; consumer edits may be overwritten.
# Classify one GitHub event into exactly one route. Pure: no network, no gh calls, so
# verify-route-matrix.sh can source this file and exercise the same code the router runs.
#
# Reads the event facts from the environment and writes `key=value` lines to stdout.
# The caller appends them to $GITHUB_OUTPUT.

set -euo pipefail

readonly AUDIT_CRON="17 1 * * 1"
readonly AUDIT_CLOSE_CRON="43 3 * * *"
readonly CLEANUP_ARTIFACTS_CRON="0 6 * * *"
readonly STALE_RECOVERY_CRON="0 */2 * * *"
# Daily, but it proposes far less often than daily: the worker holds one open
# proposal at a time and skips while that slot is filled. The cron is a heartbeat,
# the queue is the pacing.
readonly PROPOSE_CRON="29 7 * * *"

has_label() {
  jq -e --arg name "$1" 'index($name)' >/dev/null 2>&1 <<<"${ISSUE_LABELS:-[]}"
}

is_issue_number() {
  [[ "${1:-}" =~ ^[1-9][0-9]*$ ]]
}

classify_route() {
  local route="none" error=""
  local issue_number="" pr_number="" ci_conclusion="" ci_run_id=""
  local refine_mode="" direct_mode="" trigger_kind=""

  case "${EVENT:-}" in
    issues)
      if [ "${ACTION:-}" = "labeled" ]; then
        case "${LABEL:-}" in
          refine)
            route="refine"
            refine_mode="first"
            issue_number="${EVENT_ISSUE_NUMBER:-}"
            ;;
          implement)
            route="implement"
            issue_number="${EVENT_ISSUE_NUMBER:-}"
            ;;
          direct)
            route="direct"
            direct_mode="first"
            issue_number="${EVENT_ISSUE_NUMBER:-}"
            ;;
        esac
      fi
      ;;

    issue_comment)
      if [ "${COMMENT_ON_PR:-false}" = "true" ]; then
        route="apply-review"
        pr_number="${EVENT_ISSUE_NUMBER:-}"
      elif [ "${COMMENT_SENDER_TYPE:-}" = "Bot" ]; then
        error="comment authored by a bot"
      elif has_label direct; then
        route="direct"
        direct_mode="continue"
        issue_number="${EVENT_ISSUE_NUMBER:-}"
      elif ! has_label refine; then
        error="issue does not carry the refine or direct label"
      else
        route="refine"
        refine_mode="rerefine"
        issue_number="${EVENT_ISSUE_NUMBER:-}"
      fi
      ;;

    pull_request_review_comment | pull_request_review)
      route="apply-review"
      pr_number="${EVENT_PR_NUMBER:-}"
      ;;

    pull_request_target)
      route="bot-approve"
      ;;

    workflow_run)
      if is_issue_number "${RUN_PR_NUMBER:-}"; then
        route="merge-gate"
        pr_number="${RUN_PR_NUMBER}"
        ci_conclusion="${RUN_CONCLUSION:-}"
        ci_run_id="${RUN_ID:-}"
      else
        error="CI run has no attached pull request"
      fi
      ;;

    schedule)
      trigger_kind="scheduled"
      case "${SCHEDULE:-}" in
        "$AUDIT_CRON") route="audit" ;;
        "$AUDIT_CLOSE_CRON") route="audit-close" ;;
        "$CLEANUP_ARTIFACTS_CRON") route="cleanup-artifacts" ;;
        "$STALE_RECOVERY_CRON") route="stale-recovery" ;;
        "$PROPOSE_CRON") route="propose" ;;
        *) error="no route for cron '${SCHEDULE:-}'" ;;
      esac
      ;;

    workflow_dispatch)
      trigger_kind="manual"
      case "${OPERATION:-}" in
        refine | implement | direct)
          if is_issue_number "${INPUT_ISSUE_NUMBER:-}"; then
            route="${OPERATION}"
            issue_number="${INPUT_ISSUE_NUMBER}"
            if [ "$OPERATION" = "refine" ]; then
              refine_mode="${INPUT_MODE:-first}"
            elif [ "$OPERATION" = "direct" ]; then
              direct_mode="${INPUT_MODE:-first}"
            fi
          else
            error="operation '${OPERATION}' needs a positive issue-number, got '${INPUT_ISSUE_NUMBER:-}'"
          fi
          ;;
        apply-review)
          if is_issue_number "${INPUT_PR_NUMBER:-}"; then
            route="apply-review"
            pr_number="${INPUT_PR_NUMBER}"
          else
            error="operation 'apply-review' needs a positive pr-number, got '${INPUT_PR_NUMBER:-}'"
          fi
          ;;
        merge-gate)
          if is_issue_number "${INPUT_PR_NUMBER:-}"; then
            route="merge-gate"
            pr_number="${INPUT_PR_NUMBER}"
            ci_conclusion="${INPUT_CI_CONCLUSION:-}"
            ci_run_id="${INPUT_CI_RUN_ID:-}"
          else
            error="operation 'merge-gate' needs a positive pr-number, got '${INPUT_PR_NUMBER:-}'"
          fi
          ;;
        audit | propose)
          route="${OPERATION}"
          trigger_kind="${INPUT_TRIGGER_KIND:-manual}"
          ;;
        audit-close | cleanup-artifacts | stale-recovery | validate)
          route="${OPERATION}"
          ;;
        *)
          error="unknown operation '${OPERATION:-}'"
          ;;
      esac
      ;;

    *)
      error="unsupported event '${EVENT:-}'"
      ;;
  esac

  cat <<EOF
route=${route}
issue-number=${issue_number}
pr-number=${pr_number}
ci-conclusion=${ci_conclusion}
ci-run-id=${ci_run_id}
refine-mode=${refine_mode}
direct-mode=${direct_mode}
trigger-kind=${trigger_kind}
error=${error}
EOF
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  classify_route
fi
