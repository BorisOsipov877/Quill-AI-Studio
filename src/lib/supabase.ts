import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Public client: respects Row Level Security. Safe for reading generation
// history from Server Components. Lazy singleton so env vars are read on first
// use, not at module import (Next.js imports route modules during the build).
export function getSupabaseClient(): SupabaseClient {
  if (publicClient) return publicClient;
  publicClient = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );
  return publicClient;
}

// Admin client: uses the service-role key and bypasses RLS. Only the Server
// Action uses this, to write a generation. Never import into client code.
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  adminClient = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  return adminClient;
}
