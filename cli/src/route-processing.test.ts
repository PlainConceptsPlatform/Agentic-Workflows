import { describe, expect, it } from "vitest";

import {
  addRouteExclusion,
  excludedWorkerFiles,
  processRoutes,
  stripRouteFromClassifier,
  stripRouteFromRouter,
} from "./route-processing.js";
import { routeNames, type RouteName } from "./workflow-catalog.js";

const ROUTER_YAML = `# header
name: "All Work Router"

on:
  schedule:
    - cron: "17 1 * * 1"
    - cron: "43 3 * * *"
    - cron: "0 6 * * *"
    - cron: "0 */2 * * *"
    - cron: "29 7 * * *"

  workflow_dispatch:
    inputs:
      operation:
        description: "Operation to run"
        required: true
        type: choice
        options:
          - refine
          - implement
          - direct
          - apply-review
          - merge-gate
          - audit
          - propose
          - audit-close
          - cleanup-artifacts
          - stale-recovery
          - validate

jobs:
  call-refine:
    needs: [classify, authorize]
    if: needs.classify.outputs.route == 'refine' && needs.authorize.outputs.trusted == 'true'
    uses: ./.github/workflows/agent-refine.lock.yml
    secrets:
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

  call-implement:
    needs: [classify, authorize]
    if: needs.classify.outputs.route == 'implement' && needs.authorize.outputs.trusted == 'true'
    uses: ./.github/workflows/agent-implement.lock.yml
    secrets:
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

  call-audit:
    needs: classify
    if: needs.classify.outputs.route == 'audit'
    uses: ./.github/workflows/agent-audit.lock.yml
    secrets:
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

  call-propose:
    needs: classify
    if: needs.classify.outputs.route == 'propose'
    uses: ./.github/workflows/agent-propose.lock.yml
    secrets:
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

  audit-close:
    needs: classify
    if: needs.classify.outputs.route == 'audit-close'
    runs-on: ubuntu-latest
`;

const CLASSIFIER_SH = `#!/usr/bin/env bash
set -euo pipefail

readonly AUDIT_CRON="17 1 * * 1"
readonly AUDIT_CLOSE_CRON="43 3 * * *"
readonly CLEANUP_ARTIFACTS_CRON="0 6 * * *"
readonly STALE_RECOVERY_CRON="0 */2 * * *"
readonly PROPOSE_CRON="29 7 * * *"

classify_route() {
  local route="none" error=""

  case "\${EVENT:-}" in
    schedule)
      trigger_kind="scheduled"
      case "\${SCHEDULE:-}" in
        "\$AUDIT_CRON") route="audit" ;;
        "\$AUDIT_CLOSE_CRON") route="audit-close" ;;
        "\$CLEANUP_ARTIFACTS_CRON") route="cleanup-artifacts" ;;
        "\$STALE_RECOVERY_CRON") route="stale-recovery" ;;
        "\$PROPOSE_CRON") route="propose" ;;
        *) error="no route for cron '\${SCHEDULE:-}'" ;;
      esac
      ;;

    workflow_dispatch)
      trigger_kind="manual"
      case "\${OPERATION:-}" in
        refine | implement | direct)
          route="\${OPERATION}"
          ;;
        apply-review)
          route="apply-review"
          ;;
        merge-gate)
          route="merge-gate"
          ;;
        audit | propose)
          route="\${OPERATION}"
          trigger_kind="\${INPUT_TRIGGER_KIND:-manual}"
          ;;
        audit-close | cleanup-artifacts | stale-recovery | validate)
          route="\${OPERATION}"
          ;;
        *)
          error="unknown operation '\${OPERATION:-}'"
          ;;
      esac
      ;;
  esac

  cat <<EOF
route=\${route}
error=\${error}
EOF
}

if [ "\${BASH_SOURCE[0]}" = "\$0" ]; then
  classify_route
fi
`;

const MATRIX_SH = `#!/usr/bin/env bash
set -euo pipefail

echo "── Router wiring ─────────────────────────────────────────────────────────"
for route in refine implement direct apply-review merge-gate audit propose bot-approve \\
  audit-close cleanup-artifacts stale-recovery validate; do
  if grep -q "route == '\${route}'" "\$ROUTER_YML"; then
    PASS=\$((PASS + 1))
  else
    FAIL=\$((FAIL + 1))
    echo "FAIL: work-router.yml has no job for route '\${route}'" >&2
  fi
done

while read -r operation; do
  if grep -q "route == '\${operation}'" "\$ROUTER_YML"; then
    PASS=\$((PASS + 1))
  else
    FAIL=\$((FAIL + 1))
    echo "FAIL: dispatch operation '\${operation}' has no job in work-router.yml" >&2
  fi
done < <(sed -n '/^      operation:/,/^      issue-number:/p' "\$ROUTER_YML" | sed -n 's/^          - //p')

echo
if [ "\$FAIL" -eq 0 ]; then
  echo "Route matrix: \${PASS} passed"
else
  echo "Route matrix: \${PASS} passed, \${FAIL} FAILED" >&2
fi

exit \$((FAIL > 0))
`;

describe("stripRouteFromRouter", () => {
  it("removes the propose cron entry", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "propose");

    expect(result).not.toContain('cron: "29 7 * * *"');
    expect(result).toContain('cron: "17 1 * * 1"');
  });

  it("removes the call-propose job block", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "propose");

    expect(result).not.toContain("call-propose");
    expect(result).toContain("call-refine");
    expect(result).toContain("call-audit");
  });

  it("removes propose from the dispatch options", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "propose");

    expect(result).not.toMatch(/^\s+- propose$/m);
    expect(result).toMatch(/^\s+- refine$/m);
    expect(result).toMatch(/^\s+- audit$/m);
  });

  it("removes the audit cron entry", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "audit");

    expect(result).not.toContain('cron: "17 1 * * 1"');
    expect(result).toContain('cron: "29 7 * * *"');
  });

  it("removes the call-audit job block", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "audit");

    expect(result).not.toContain("call-audit");
    expect(result).toContain("call-refine");
  });

  it("preserves the audit-close job when removing audit", () => {
    const result = stripRouteFromRouter(ROUTER_YAML, "audit");

    expect(result).toContain("audit-close");
  });

  it("does not modify the yaml when stripping a route that has no cron", () => {
    const yamlWithoutCron = ROUTER_YAML.replace(/    - cron: "17 1 \* \* 1"\n/, "");
    const result = stripRouteFromRouter(yamlWithoutCron, "audit");

    expect(result).not.toContain("call-audit");
  });
});

describe("stripRouteFromClassifier", () => {
  it("removes the PROPOSE_CRON constant", () => {
    const result = stripRouteFromClassifier(CLASSIFIER_SH, "propose");

    expect(result).not.toContain('readonly PROPOSE_CRON');
    expect(result).toContain('readonly AUDIT_CRON');
  });

  it("removes the propose schedule case", () => {
    const result = stripRouteFromClassifier(CLASSIFIER_SH, "propose");

    expect(result).not.toContain('"$PROPOSE_CRON") route="propose"');
    expect(result).toContain('"$AUDIT_CRON") route="audit"');
  });

  it("removes the AUDIT_CRON constant", () => {
    const result = stripRouteFromClassifier(CLASSIFIER_SH, "audit");

    expect(result).not.toContain('readonly AUDIT_CRON');
    expect(result).toContain('readonly PROPOSE_CRON');
  });

  it("removes the audit schedule case", () => {
    const result = stripRouteFromClassifier(CLASSIFIER_SH, "audit");

    expect(result).not.toContain('"$AUDIT_CRON") route="audit"');
    expect(result).toContain('"$PROPOSE_CRON") route="propose"');
  });

  it("removes propose from the dispatch case union", () => {
    const result = stripRouteFromClassifier(CLASSIFIER_SH, "propose");

    expect(result).not.toContain("audit | propose)");
    expect(result).toContain("audit)");
  });
});

describe("addRouteExclusion", () => {
  it("adds an exclusion assertion for the route", () => {
    const result = addRouteExclusion(MATRIX_SH, "propose");

    expect(result).toContain("excluded route 'propose'");
    expect(result).toContain("propose correctly excluded from work-router.yml");
  });

  it("does not add the exclusion twice", () => {
    const once = addRouteExclusion(MATRIX_SH, "propose");
    const twice = addRouteExclusion(once, "propose");

    const matchCount = (twice.match(/excluded route 'propose'/g) ?? []).length;
    expect(matchCount).toBe(1);
  });
});

describe("processRoutes", () => {
  it("returns the same map when all routes are selected", () => {
    const files = new Map<string, string>([
      ["work-router.yml", ROUTER_YAML],
      ["classify-route.sh", CLASSIFIER_SH],
      ["verify-route-matrix.sh", MATRIX_SH],
    ]);

    const result = processRoutes(files, [...routeNames]);

    expect(result).toBe(files);
  });

  it("returns the same map when no routes are selected (keeps full router/classifier/matrix)", () => {
    const files = new Map<string, string>([
      [".github/workflows/work-router.yml", ROUTER_YAML],
      [".github/actions/classify-route/classify-route.sh", CLASSIFIER_SH],
      [".github/actions/verify-route-matrix/verify-route-matrix.sh", MATRIX_SH],
    ]);

    const result = processRoutes(files, []);

    expect(result).toBe(files);
    const router = result.get(".github/workflows/work-router.yml")!;
    expect(router).toContain("call-propose");
    expect(router).toContain("call-audit");
    expect(router).toContain("- propose");
  });

  it("strips propose from all three files when unselected", () => {
    const files = new Map<string, string>([
      [".github/workflows/work-router.yml", ROUTER_YAML],
      [".github/actions/classify-route/classify-route.sh", CLASSIFIER_SH],
      [".github/actions/verify-route-matrix/verify-route-matrix.sh", MATRIX_SH],
    ]);

    const selectedRoutes = routeNames.filter((r) => r !== "propose") as readonly RouteName[];
    const result = processRoutes(files, selectedRoutes);

    const router = result.get(".github/workflows/work-router.yml")!;
    expect(router).not.toContain("call-propose");
    expect(router).not.toContain('cron: "29 7 * * *"');
    expect(router).not.toMatch(/^\s+- propose$/m);

    const classifier = result.get(".github/actions/classify-route/classify-route.sh")!;
    expect(classifier).not.toContain("readonly PROPOSE_CRON");
    expect(classifier).not.toContain('"$PROPOSE_CRON")');

    const matrix = result.get(".github/actions/verify-route-matrix/verify-route-matrix.sh")!;
    expect(matrix).toContain("excluded route 'propose'");
  });

  it("strips audit from all three files when unselected", () => {
    const files = new Map<string, string>([
      ["work-router.yml", ROUTER_YAML],
      ["classify-route.sh", CLASSIFIER_SH],
      ["verify-route-matrix.sh", MATRIX_SH],
    ]);

    const selectedRoutes = routeNames.filter((r) => r !== "audit") as readonly RouteName[];
    const result = processRoutes(files, selectedRoutes);

    const router = result.get("work-router.yml")!;
    expect(router).not.toContain("call-audit");
    expect(router).not.toContain('cron: "17 1 * * 1"');

    const classifier = result.get("classify-route.sh")!;
    expect(classifier).not.toContain("readonly AUDIT_CRON");
    expect(classifier).not.toContain('"$AUDIT_CRON")');
  });

  it("processes multiple excluded routes at once", () => {
    const files = new Map<string, string>([
      ["work-router.yml", ROUTER_YAML],
      ["classify-route.sh", CLASSIFIER_SH],
      ["verify-route-matrix.sh", MATRIX_SH],
    ]);

    const selectedRoutes = ["refine", "implement"] as readonly RouteName[];
    const result = processRoutes(files, selectedRoutes);

    const router = result.get("work-router.yml")!;
    expect(router).toContain("call-refine");
    expect(router).toContain("call-implement");
    expect(router).not.toContain("call-audit");
    expect(router).not.toContain("call-propose");
  });
});

describe("excludedWorkerFiles", () => {
  it("returns worker files for unselected routes", () => {
    const selectedRoutes: readonly RouteName[] = ["refine", "implement"];
    const excluded = excludedWorkerFiles(selectedRoutes);

    expect(excluded.has("agent-refine.md")).toBe(false);
    expect(excluded.has("agent-implement.md")).toBe(false);
    expect(excluded.has("agent-audit.md")).toBe(true);
    expect(excluded.has("agent-propose.md")).toBe(true);
  });

  it("returns an empty set when all routes are selected", () => {
    const excluded = excludedWorkerFiles([...routeNames]);

    expect(excluded.size).toBe(0);
  });

  it("returns all worker files when no routes are selected", () => {
    const excluded = excludedWorkerFiles([]);

    expect(excluded.size).toBe(7);
    expect(excluded.has("agent-refine.md")).toBe(true);
    expect(excluded.has("agent-implement.md")).toBe(true);
    expect(excluded.has("agent-direct.md")).toBe(true);
    expect(excluded.has("agent-apply-review.md")).toBe(true);
    expect(excluded.has("agent-merge-gate.md")).toBe(true);
    expect(excluded.has("agent-audit.md")).toBe(true);
    expect(excluded.has("agent-propose.md")).toBe(true);
  });
});
