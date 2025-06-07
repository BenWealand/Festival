import { createClient } from '@supabase/supabase-js';

// Create the Supabase client for the backend server
const supabaseServer = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY, {
  auth: {
    // No storage needed for server-side client
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export { supabaseServer, createClient }; // Export both the service role client and the createClient function 