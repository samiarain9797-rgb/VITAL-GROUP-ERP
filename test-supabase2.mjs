import { createClient } from '@supabase/supabase-js';

const url = "https://stzrpbvwptndiojsyxrz.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0enJwYnZ3cHRuZGlvanN5eHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjAxODEsImV4cCI6MjA5NDAzNjE4MX0.3QDZ77PJ8WsiMOfJ-8NGU7I7i0nOGVaqbQV8WWV32zI";

const supabase = createClient(url, key);

supabase.auth.signInWithPassword({email: 'a@b.com', password: '123'}).then(({data, error}) => {
  console.log('SignIn result:', data, error);
}).catch(e => {
  console.error('Exception:', e);
});
