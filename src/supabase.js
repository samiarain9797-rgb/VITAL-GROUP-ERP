import { createClient } from '@supabase/supabase-js';

export const cleanSupabaseUrl = "https://zndmxckvyautktafoqky.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZG14Y2t2eWF1dGt0YWZvcWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzc5NDcsImV4cCI6MjA5MzgxMzk0N30.y1GEOaPlTKtkVx09n8_pDXRhXAaL89CLC9kgz-tEKtQ";

export const supabase = createClient(
  cleanSupabaseUrl,
  supabaseAnonKey
);
