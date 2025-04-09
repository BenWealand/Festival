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

// Function to set a user as the owner of a location
export async function setLocationOwner(locationId, userId) {
  try {
    const { error } = await supabase
      .from('locations')
      .update({ owner_id: userId })
      .eq('id', locationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error setting location owner:', err);
    throw err;
  }
}

// Function to check if a user is the owner of a location
export async function isLocationOwner(locationId, userId) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('owner_id')
      .eq('id', locationId)
      .single();

    if (error) throw error;
    return data?.owner_id === userId;
  } catch (err) {
    console.error('Error checking location ownership:', err);
    throw err;
  }
}
