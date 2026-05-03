import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT,
  EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT,
  buildFamousGameSeedBranches,
  type FamousGameSeedBranch,
} from "../src/games/famousGames";
import type { Database } from "../src/supabase/database.types";

const CONFIRM_FLAG = "--confirm-clear-test-data";
const DRY_RUN_FLAG = "--dry-run";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

loadEnvFile(".env");
loadEnvFile(".env.local");

const args = new Set(process.argv.slice(2));

if (!args.has(CONFIRM_FLAG)) {
  console.error(`Refusing to clear Supabase data without ${CONFIRM_FLAG}.`);
  process.exit(1);
}

const rows = buildFamousGameSeedBranches();
const branchRows = rows.map(toBranchInsert);

if (rows.length !== EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT) {
  throw new Error(`Expected ${EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT} rows, got ${rows.length}.`);
}

if (rows.filter((row) => row.is_final).length !== EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT) {
  throw new Error(`Expected ${EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT} final rows.`);
}

if (args.has(DRY_RUN_FLAG)) {
  console.log(
    `Dry run: would clear public.branches and insert ${branchRows.length} famous-game branches.`,
  );
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this seed script.");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

try {
  const deleteResult = await supabase.from("branches").delete().neq("id", ZERO_UUID);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  const insertResult = await supabase.from("branches").insert(branchRows);

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  const [totalResult, finalResult] = await Promise.all([
    supabase.from("branches").select("*", { count: "exact", head: true }),
    supabase.from("branches").select("*", { count: "exact", head: true }).eq("is_final", true),
  ]);

  if (totalResult.error) {
    throw new Error(totalResult.error.message);
  }

  if (finalResult.error) {
    throw new Error(finalResult.error.message);
  }

  console.log(
    `Seeded ${totalResult.count ?? 0} famous-game branches, including ${finalResult.count ?? 0} final games.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Famous game seed failed.");
  process.exitCode = 1;
}

function toBranchInsert({
  gameKey: _gameKey,
  gameTitle: _gameTitle,
  ply: _ply,
  ...branch
}: FamousGameSeedBranch): Database["public"]["Tables"]["branches"]["Insert"] {
  return branch;
}

function loadEnvFile(path: string): void {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    return;
  }

  for (const line of readFileSync(absolutePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/gu, "");

    if (key && typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}
