import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Vite browser Supabase client (equivalent of the Next.js `utils/supabase/client.ts`).
// Uses the browser-safe publishable / anon key. The admin app currently talks to the
// Express API, so this is optional/ready for direct Supabase use (auth, storage, realtime).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
