import type { BranchRecord } from "./branchTypes";

export type BranchTreeNode = {
  branch: BranchRecord;
  children: BranchTreeNode[];
  depth: number;
};

export function filterOpenBranches(branches: BranchRecord[]): BranchRecord[] {
  return branches.filter((branch) => !branch.isFinal);
}

export function filterFinishedBranches(branches: BranchRecord[]): BranchRecord[] {
  return branches.filter((branch) => branch.isFinal);
}

export function buildBranchTree(branches: BranchRecord[]): BranchTreeNode[] {
  const sorted = [...branches].sort(compareBranchAge);
  const nodes = new Map<string, BranchTreeNode>();

  for (const branch of sorted) {
    nodes.set(branch.payload, { branch, children: [], depth: 0 });
  }

  const roots: BranchTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.branch.parentPayload ? nodes.get(node.branch.parentPayload) : null;

    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  for (const root of roots) {
    applyDepth(root, 0);
  }

  return roots;
}

export function flattenBranchTree(nodes: BranchTreeNode[]): BranchTreeNode[] {
  const flat: BranchTreeNode[] = [];

  function visit(node: BranchTreeNode) {
    flat.push(node);
    for (const child of node.children) {
      visit(child);
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return flat;
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

function applyDepth(node: BranchTreeNode, depth: number): void {
  node.depth = depth;
  node.children.sort((left, right) => compareBranchAge(left.branch, right.branch));

  for (const child of node.children) {
    applyDepth(child, depth + 1);
  }
}

function compareBranchAge(left: BranchRecord, right: BranchRecord): number {
  return Date.parse(left.recordedAt) - Date.parse(right.recordedAt);
}
