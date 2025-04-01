import 'react-native-url-polyfill/auto'; // Polyfill for URL support
import AsyncStorage from '@react-native-async-storage/async-storage'; // AsyncStorage for session persistence
import { createClient } from '@supabase/supabase-js'; // Supabase client
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env'; // Load environment variables

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for storing session data
    autoRefreshToken: true, // Automatically refresh the authentication token
    persistSession: true, // Persist the session across app restarts
    detectSessionInUrl: false, // Don't try to detect session from URL (not needed for React Native)
  },
});
