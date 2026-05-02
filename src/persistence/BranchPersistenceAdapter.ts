import type { PublishedStateV1 } from "../domain/state/publishedState";

export type PublishBranchInput = {
  parentPayload: string | null;
  parentFen: string;
  childPayload: string;
  childState: PublishedStateV1;
  shareUrl: string;
};

export type PublishBranchResult =
  | { kind: "local-only" }
  | { kind: "saved"; branchId: string };

export interface BranchPersistenceAdapter {
  publishBranch(input: PublishBranchInput): Promise<PublishBranchResult>;
}
