import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (typeof cachedClient !== "undefined") {
    return cachedClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  cachedClient = url && key ? createClient<Database>(url, key) : null;
  return cachedClient;
}

function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
}

function getSupabasePublishableKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}
