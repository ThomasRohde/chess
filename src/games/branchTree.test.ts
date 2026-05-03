import { describe, expect, it } from "vitest";

import {
  BRANCH_TREE_ROOT_ID,
  buildBranchTreeData,
  countChildren,
  filterFinishedBranches,
  filterOpenBranches,
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

  it("builds headless tree data and keeps orphan branches visible", () => {
    const branches = [
      branch({ payload: "child", parentPayload: "root", recordedAt: "2026-05-01T10:01:00.000Z" }),
      branch({ payload: "orphan", parentPayload: "missing", recordedAt: "2026-05-01T10:02:00.000Z" }),
      branch({ payload: "root", parentPayload: null, recordedAt: "2026-05-01T10:00:00.000Z" }),
    ];

    const treeData = buildBranchTreeData(branches);

    expect(treeData.rootItemId).toBe(BRANCH_TREE_ROOT_ID);
    expect(treeData.items[BRANCH_TREE_ROOT_ID].childrenIds).toEqual(["root", "orphan"]);
    expect(treeData.items.root.childrenIds).toEqual(["child"]);
    expect(treeData.items.child.childrenIds).toEqual([]);
    expect(treeData.items.root.ancestorLines).toEqual([]);
    expect(treeData.items.root.isLastSibling).toBe(false);
    expect(treeData.items.child.ancestorLines).toEqual([true]);
    expect(treeData.items.child.isLastSibling).toBe(true);
    expect(treeData.items.orphan.ancestorLines).toEqual([]);
    expect(treeData.items.orphan.isLastSibling).toBe(true);
    expect(treeData.items.root.directChildCount).toBe(1);
    expect(treeData.expandedFolderIds).toEqual([BRANCH_TREE_ROOT_ID, "root"]);
  });

  it("can build a flat result list for finished games", () => {
    const treeData = buildBranchTreeData(
      [
        branch({ payload: "child", parentPayload: "root", recordedAt: "2026-05-01T10:01:00.000Z" }),
        branch({ payload: "root", parentPayload: null, recordedAt: "2026-05-01T10:00:00.000Z" }),
      ],
      { flat: true },
    );

    expect(treeData.items[BRANCH_TREE_ROOT_ID].childrenIds).toEqual(["root", "child"]);
    expect(treeData.items.root.childrenIds).toEqual([]);
    expect(treeData.items.child.childrenIds).toEqual([]);
    expect(treeData.expandedFolderIds).toEqual([BRANCH_TREE_ROOT_ID]);
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
