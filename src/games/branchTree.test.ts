import { describe, expect, it } from "vitest";

import {
  buildBranchTree,
  countChildren,
  filterFinishedBranches,
  filterOpenBranches,
  flattenBranchTree,
} from "./branchTree";
import type { BranchRecord } from "./branchTypes";

describe("branchTree", () => {
  it("filters open and finished branches", () => {
    const branches = [
      branch({ payload: "a", isFinal: false }),
      branch({ payload: "b", isFinal: true, statusKind: "checkmate" }),
    ];

    expect(filterOpenBranches(branches).map((record) => record.payload)).toEqual(["a"]);
    expect(filterFinishedBranches(branches).map((record) => record.payload)).toEqual(["b"]);
  });

  it("builds a depth-annotated branch tree and keeps orphan branches visible", () => {
    const branches = [
      branch({ payload: "child", parentPayload: "root", recordedAt: "2026-05-01T10:01:00.000Z" }),
      branch({ payload: "orphan", parentPayload: "missing", recordedAt: "2026-05-01T10:02:00.000Z" }),
      branch({ payload: "root", parentPayload: null, recordedAt: "2026-05-01T10:00:00.000Z" }),
    ];

    const flat = flattenBranchTree(buildBranchTree(branches));

    expect(flat.map((node) => [node.branch.payload, node.depth])).toEqual([
      ["root", 0],
      ["child", 1],
      ["orphan", 0],
    ]);
  });

  it("counts direct children across all branches", () => {
    const counts = countChildren([
      branch({ payload: "root", parentPayload: null }),
      branch({ payload: "a", parentPayload: "root" }),
      branch({ payload: "b", parentPayload: "root" }),
      branch({ payload: "c", parentPayload: "a" }),
    ]);

    expect(counts.get("root")).toBe(2);
    expect(counts.get("a")).toBe(1);
    expect(counts.get("b")).toBeUndefined();
  });
});

function branch(overrides: Partial<BranchRecord>): BranchRecord {
  return {
    id: overrides.payload ?? "id",
    payload: "payload",
    parentPayload: null,
    parentFen: "parent",
    fen: "fen",
    publishedBy: "Ada",
    lastMoveUci: "e2e4",
    lastMoveSan: "e4",
    statusKind: "active",
    statusLabel: "Black to move.",
    sideToMove: "black",
    isFinal: false,
    stateCreatedAt: "2026-05-01T10:00:00.000Z",
    recordedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}
