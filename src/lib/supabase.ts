import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY が設定されていません。.env を確認してください。'
  );
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
