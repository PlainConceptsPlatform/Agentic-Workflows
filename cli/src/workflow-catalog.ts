export const routeNames = [
  "refine",
  "implement",
  "direct",
  "apply-review",
  "merge-gate",
  "audit",
  "propose",
] as const;

export type RouteName = (typeof routeNames)[number];

export interface WorkflowRoute {
  readonly name: RouteName;
  readonly worker: string;
  readonly defaultEnabled: boolean;
}

export const workflowRoutes: readonly WorkflowRoute[] = [
  { name: "refine", worker: "agent-refine.md", defaultEnabled: true },
  { name: "implement", worker: "agent-implement.md", defaultEnabled: true },
  { name: "direct", worker: "agent-direct.md", defaultEnabled: true },
  { name: "apply-review", worker: "agent-apply-review.md", defaultEnabled: true },
  { name: "merge-gate", worker: "agent-merge-gate.md", defaultEnabled: true },
  { name: "audit", worker: "agent-audit.md", defaultEnabled: true },
  { name: "propose", worker: "agent-propose.md", defaultEnabled: false },
];

export const packageOwnedTargets = [
  ".github/actions",
  ".github/workflows/agent-*.md",
  ".github/workflows/shared/platform-defaults.md",
  ".github/workflows/shared/opencode-ci.md",
  ".github/workflows/work-router.yml",
  "scripts/compile-agent-workflows.mjs",
] as const;

export const generatedConsumerTargets = [
  ".github/workflows/agent-*.lock.yml",
  ".github/aw/actions-lock.json",
] as const;

export const templateNames = [
  "agentics-checks",
  "agentics-maintenance",
  "app-ci-dotnet-next",
  "app-ci-node-monorepo",
] as const;

export type TemplateName = (typeof templateNames)[number];
