import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://aakqexydkkkqplzakkoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFha3FleHlka2trcXBsemFra29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NzAyNzcsImV4cCI6MjA1ODM0NjI3N30.gZGfp-XQZopkDpDunbcKR1iDAGDwwq0fERop9-RJv2E ';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})