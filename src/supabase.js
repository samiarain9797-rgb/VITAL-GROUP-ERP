import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
if (supabaseUrl && supabaseUrl.includes('.supabase.co')) {
  const urlObj = new URL(supabaseUrl);
  supabaseUrl = `${urlObj.protocol}//${urlObj.host}`;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please check your environment variables.");
}

export const cleanSupabaseUrl = supabaseUrl;
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
