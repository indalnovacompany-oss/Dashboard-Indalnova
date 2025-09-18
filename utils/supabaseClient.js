import { createClient } from "@supabase/supabase-js";

// Use Service Role Key for backend operations
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase environment variables are missing! Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
}

// This client should be used **only in backend** (Node.js server)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
