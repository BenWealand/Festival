import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import LocationTracker from '../components/LocationTracker';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';

export default function HomeScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        console.log('Starting to fetch locations...');
        
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, logo_url, points')
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

        console.log('Processed locations data:', data);
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error.message);
        setError(`Failed to load locations: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
        },
        (payload) => {
          console.log('Location change detected:', payload);
          if (payload.eventType === 'INSERT') {
            setLocations(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setLocations(prev => prev.map(loc => 
              loc.id === payload.new.id ? payload.new : loc
            ));
          } else if (payload.eventType === 'DELETE') {
            setLocations(prev => prev.filter(loc => loc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
                <Text style={styles.pointsNumber}>{location.points || 0}</Text>
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