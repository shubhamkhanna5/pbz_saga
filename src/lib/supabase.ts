import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || String(SUPABASE_URL).includes('your-project') || String(SUPABASE_ANON_KEY) === 'your-anon-key') {
  console.warn('⚠️ Supabase configuration is using placeholders. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or update src/config/supabase.ts');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
