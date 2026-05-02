import { describe, expect, it, vi } from "vitest";

import { SupabaseBranchPersistenceAdapter } from "./SupabaseBranchPersistenceAdapter";
import type { PublishBranchInput } from "./BranchPersistenceAdapter";

const input: PublishBranchInput = {
  parentPayload: "parent",
  parentFen: "parent-fen",
  childPayload: "child",
  childState: {
    version: 1,
    fen: "child-fen",
    publishedBy: "Ada",
    lastMove: { uci: "e2e4", san: "e4" },
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  shareUrl: "https://example.com/chess/#/child",
};

describe("SupabaseBranchPersistenceAdapter", () => {
  it("falls back to local-only when Supabase is not configured", async () => {
    const adapter = new SupabaseBranchPersistenceAdapter(null);

    await expect(adapter.publishBranch(input)).resolves.toEqual({ kind: "local-only" });
  });

  it("publishes through the Edge Function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { branch: { id: "branch-id" } },
      error: null,
    });
    const adapter = new SupabaseBranchPersistenceAdapter({
      functions: { invoke },
    } as never);

    await expect(adapter.publishBranch(input)).resolves.toEqual({
      kind: "saved",
      branchId: "branch-id",
    });
    expect(invoke).toHaveBeenCalledWith("publish-branch", {
      body: {
        parentPayload: "parent",
        parentFen: "parent-fen",
        payload: "child",
      },
    });
  });

  it("surfaces Edge Function errors", async () => {
    const adapter = new SupabaseBranchPersistenceAdapter({
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Rejected branch" },
        }),
      },
    } as never);

    await expect(adapter.publishBranch(input)).rejects.toThrow("Rejected branch");
  });
});
