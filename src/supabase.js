import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://zndmxckvyautktafoqky.supabase.co').replace(/^["']|["']$/g, '').trim();
if (!supabaseUrl) {
  supabaseUrl = 'https://zndmxckvyautktafoqky.supabase.co';
}

if (supabaseUrl && supabaseUrl.includes('.supabase.co')) {
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://' + supabaseUrl;
  }
  try {
    const urlObj = new URL(supabaseUrl);
    supabaseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    console.error("Failed to parse Supabase URL", e);
  }
}

const initialAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY.replace(/^["']|["']$/g, '').trim() 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZG14Y2t2eWF1dGt0YWZvcWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzc5NDcsImV4cCI6MjA5MzgxMzk0N30.y1GEOaPlTKtkVx09n8_pDXRhXAaL89CLC9kgz-tEKtQ';

export let supabaseAnonKey = initialAnonKey;
if (!supabaseAnonKey) {
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZG14Y2t2eWF1dGt0YWZvcWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzc5NDcsImV4cCI6MjA5MzgxMzk0N30.y1GEOaPlTKtkVx09n8_pDXRhXAaL89CLC9kgz-tEKtQ';
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please check your environment variables.");
}

export const cleanSupabaseUrl = supabaseUrl;
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
