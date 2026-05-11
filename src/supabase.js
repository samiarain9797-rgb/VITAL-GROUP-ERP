import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "https://qfbiibprucjfejquzcpf.supabase.co";
export const cleanSupabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmYmlpYnBydWNqZmVqcXV6Y3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTE2MDcsImV4cCI6MjA5Mzg4NzYwN30.p2X2TAihOpU8VkFdtqhbrRVHedMFYRa6h20t36waDUk";

export const supabase = createClient(
  cleanSupabaseUrl,
  supabaseAnonKey
);

