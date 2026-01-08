import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(url, key)
console.log("SUPABASE URL:", url)
console.log("SUPABASE KEY:", key ? "LOADED" : "EMPTY")
