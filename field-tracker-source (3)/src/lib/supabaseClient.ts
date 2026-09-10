import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Deliberately untyped (no `Database` generic). Hand-written schema
// generics fight postgrest-js's inference across supabase-js versions
// in ways that aren't worth chasing by hand — see src/lib/database.types.ts
// for the actual row shapes, used to type data at the call sites instead
// (in AppContext, AuthContext, mapRows, seedRemote). If you'd rather have
// full compile-time query safety, run `supabase gen types typescript`
// against your live project and pass the generated type here as
// `createClient<Database>(...)`.
//
// When env vars are missing we still export a client (pointed at a
// placeholder) rather than throwing at import time, so the app can boot
// far enough to show the "connect Supabase" setup screen instead of a
// blank white page. Every real call site should check
// `isSupabaseConfigured` first (see AuthContext).
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
