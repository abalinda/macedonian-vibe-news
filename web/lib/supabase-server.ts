import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Prefer the service role key on the server to bypass RLS for read-only feature slots.
// Fallback to the anon key so local/dev still works if the service key is not set.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    `Supabase env vars missing on the server. URL: ${supabaseUrl ? 'Present' : 'Missing'}, KEY: ${
      supabaseKey ? 'Present' : 'Missing'
    }`
  );
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  // Ensure we always hit the latest data (no cached fetch for featured slots).
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
  },
});
