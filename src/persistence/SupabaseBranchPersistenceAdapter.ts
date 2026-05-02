import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../supabase/client";
import type { Database } from "../supabase/database.types";
import type {
  BranchPersistenceAdapter,
  PublishBranchInput,
  PublishBranchResult,
} from "./BranchPersistenceAdapter";

type PublishBranchResponse = {
  branch?: {
    id?: string;
  };
};

type PublishFunctionClient = Pick<SupabaseClient<Database>, "functions">;

export class SupabaseBranchPersistenceAdapter implements BranchPersistenceAdapter {
  constructor(private readonly client: PublishFunctionClient | null = getSupabaseClient()) {}

  async publishBranch(input: PublishBranchInput): Promise<PublishBranchResult> {
    if (!this.client) {
      return { kind: "local-only" };
    }

    const { data, error } = await this.client.functions.invoke<PublishBranchResponse>(
      "publish-branch",
      {
        body: {
          parentPayload: input.parentPayload,
          parentFen: input.parentFen,
          payload: input.childPayload,
        },
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    const branchId = data?.branch?.id;
    if (!branchId) {
      throw new Error("Supabase did not return a saved branch.");
    }

    return { kind: "saved", branchId };
  }
}
