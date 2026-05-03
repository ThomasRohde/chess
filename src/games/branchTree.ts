import type { BranchRecord } from "./branchTypes";

export const BRANCH_TREE_ROOT_ID = "__branch-tree-root__";

export type BranchTreeItem = {
  ancestorLines: boolean[];
  childrenIds: string[];
  directChildCount: number;
  id: string;
  isLastSibling: boolean;
  record: BranchRecord | null;
};

export type BranchTreeData = {
  expandedFolderIds: string[];
  items: Record<string, BranchTreeItem>;
  rootItemId: typeof BRANCH_TREE_ROOT_ID;
};

export type BuildBranchTreeDataOptions = {
  flat?: boolean;
  sortDirection?: "asc" | "desc";
};

export function filterOpenBranches(branches: BranchRecord[]): BranchRecord[] {
  return branches.filter((branch) => !branch.isFinal);
}

export function filterFinishedBranches(branches: BranchRecord[]): BranchRecord[] {
  return branches.filter((branch) => branch.isFinal);
}

export function buildBranchTreeData(
  branches: BranchRecord[],
  options: BuildBranchTreeDataOptions = {},
): BranchTreeData {
  const sorted = [...branches].sort((left, right) =>
    options.sortDirection === "desc" ? compareBranchAge(right, left) : compareBranchAge(left, right),
  );
  const items: Record<string, BranchTreeItem> = {
    [BRANCH_TREE_ROOT_ID]: {
      ancestorLines: [],
      childrenIds: [],
      directChildCount: 0,
      id: BRANCH_TREE_ROOT_ID,
      isLastSibling: true,
      record: null,
    },
  };

  for (const branch of sorted) {
    items[branch.payload] = {
      ancestorLines: [],
      childrenIds: [],
      directChildCount: 0,
      id: branch.payload,
      isLastSibling: true,
      record: branch,
    };
  }

  for (const branch of sorted) {
    const item = items[branch.payload];
    const parent =
      !options.flat && branch.parentPayload && items[branch.parentPayload]
        ? items[branch.parentPayload]
        : items[BRANCH_TREE_ROOT_ID];

    parent.childrenIds.push(item.id);
  }

  for (const item of Object.values(items)) {
    item.directChildCount = item.childrenIds.length;
  }

  applyTreeLineMetadata(items, BRANCH_TREE_ROOT_ID, []);

  return {
    expandedFolderIds: Object.values(items)
      .filter((item) => item.childrenIds.length > 0)
      .map((item) => item.id),
    items,
    rootItemId: BRANCH_TREE_ROOT_ID,
  };
}

export function countChildren(branches: BranchRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const branch of branches) {
    if (!branch.parentPayload) {
      continue;
    }

    counts.set(branch.parentPayload, (counts.get(branch.parentPayload) ?? 0) + 1);
  }

  return counts;
}

function applyTreeLineMetadata(
  items: Record<string, BranchTreeItem>,
  parentId: string,
  ancestorLines: boolean[],
): void {
  const parent = items[parentId];
  const children = parent.childrenIds;

  children.forEach((childId, index) => {
    const child = items[childId];
    const isLastSibling = index === children.length - 1;

    child.ancestorLines = ancestorLines;
    child.isLastSibling = isLastSibling;
    applyTreeLineMetadata(items, childId, [...ancestorLines, !isLastSibling]);
  });
}

function compareBranchAge(left: BranchRecord, right: BranchRecord): number {
  return Date.parse(left.recordedAt) - Date.parse(right.recordedAt);
}
