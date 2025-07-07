import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
      if (session?.user) {
        console.log('[AuthContext] Signed in user:', session.user.email, session.user.id);
        console.log('[AuthContext] Attempting to fetch profile from Supabase for user:', session.user.id);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) {
          console.error('[AuthContext] Error fetching profile:', error);
        } else {
          console.log('[AuthContext] Fetched profile:', profileData);
        }
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
      if (session?.user) {
        console.log('[AuthContext] Auth state change - user:', session.user.email, session.user.id);
        console.log('[AuthContext] Attempting to fetch profile from Supabase for user:', session.user.id);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) {
          console.error('[AuthContext] Error fetching profile:', error);
        } else {
          console.log('[AuthContext] Fetched profile:', profileData);
        }
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    profile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 