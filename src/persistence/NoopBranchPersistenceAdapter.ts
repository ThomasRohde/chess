import type {
  BranchPersistenceAdapter,
  PublishBranchInput,
  PublishBranchResult,
} from "./BranchPersistenceAdapter";

export class NoopBranchPersistenceAdapter implements BranchPersistenceAdapter {
  async publishBranch(_input: PublishBranchInput): Promise<PublishBranchResult> {
    return { kind: "local-only" };
  }
}
