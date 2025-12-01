import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debugging check
if (!supabaseUrl || !supabaseKey) {
  throw new Error(`
    Supabase Env vars missing! 
    URL: ${supabaseUrl} 
    KEY: ${supabaseKey ? 'Found' : 'Missing'}
  `)
}

export const supabase = createClient(supabaseUrl, supabaseKey)