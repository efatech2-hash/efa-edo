import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL ||
  'https://gjhttcgpovhlxkurkqct.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_aP1ur4FFsl1wQZMDMYoFTQ_hEp187EF';

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
