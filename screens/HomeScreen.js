import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import LocationTracker from '../components/LocationTracker';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        console.log('Starting to fetch locations...');
        
        // First get the user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user?.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        console.log('Profile:', profile);

        // Then fetch locations with their balances
        const { data, error } = await supabase
          .from('locations')
          .select(`
            id,
            name,
            logo_url,
            balances!inner (
              balance
            )
          `)
          .eq('balances.user_id', profile.id)
          .order('id', { ascending: true });

        console.log('Raw Supabase response:', { data, error });
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        // Transform the data to match our expected format
        const transformedData = data.map(location => ({
          id: location.id,
          name: location.name,
          logo_url: location.logo_url,
          points: location.balances[0]?.balance || 0
        }));

        console.log('Processed locations data:', transformedData);
        setLocations(transformedData);
      } catch (error) {
        console.error('Error fetching locations:', error.message);
        setError(`Failed to load locations: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchLocations();
    }

    // Set up real-time subscription for both locations and balances
    const locationsSubscription = supabase
      .channel('locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
        },
        async (payload) => {
          console.log('Location change detected:', payload);
          // When a location changes, refetch all data to ensure balances are up to date
          if (user) {
            fetchLocations();
          }
        }
      )
      .subscribe();

    const balancesSubscription = supabase
      .channel('balances_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balances',
        },
        async (payload) => {
          console.log('Balance change detected:', payload);
          // When a balance changes, refetch all data
          if (user) {
            fetchLocations();
          }
        }
      )
      .subscribe();

    return () => {
      locationsSubscription.unsubscribe();
      balancesSubscription.unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setLoading(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LocationTracker />
      
      <View style={styles.locationsContainer}>
        {locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="map-marker" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No locations available</Text>
          </View>
        ) : (
          locations.map((location) => (
            <TouchableOpacity 
              key={location.id} 
              style={styles.locationBox}
              onPress={() => console.log('Location pressed:', location.id)}
            >
              <View style={styles.logoContainer}>
                {location.logo_url ? (
                  <Image 
                    source={{ uri: location.logo_url }} 
                    style={styles.logo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.logoCircle}>
                    <FontAwesome name="building" size={24} color={COLORS.text.white} />
                  </View>
                )}
              </View>
              
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>{location.name}</Text>
              </View>
              
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsNumber}>{location.points}</Text>
                <Text style={styles.pointsLabel}>points</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface.primary,
  },
  errorText: {
    color: COLORS.text.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  locationsContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: COLORS.text.muted,
    fontSize: 16,
    marginTop: 16,
  },
  locationBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  pointsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.text.white,
    marginTop: 4,
  },
}); 