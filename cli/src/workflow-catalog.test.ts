import { describe, expect, it } from "vitest";

import {
  consumerOwnedTargets,
  generatedConsumerTargets,
  packageOwnedTargets,
  routeNames,
  workflowRoutes,
} from "./workflow-catalog.js";

describe("workflow catalog", () => {
  it("assigns one worker to each route", () => {
    expect(workflowRoutes.map((route) => route.name)).toEqual(routeNames);
    expect(new Set(workflowRoutes.map((route) => route.worker)).size).toBe(workflowRoutes.length);
  });

  it("keeps generated and consumer-owned files outside package ownership", () => {
    const packageTargets = new Set<string>(packageOwnedTargets);

    for (const target of [...consumerOwnedTargets, ...generatedConsumerTargets]) {
      expect(packageTargets.has(target)).toBe(false);
    }
  });
});
