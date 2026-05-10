import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel."
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};

// For direct access where we know it's initialized (like in hooks)
export const supabase = {
  get auth() { return getSupabase().auth; },
  from: (table: string) => getSupabase().from(table),
  channel: (name: string) => getSupabase().channel(name),
  removeChannel: (channel: any) => getSupabase().removeChannel(channel),
};
