import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import LocationTracker from '../components/LocationTracker';
import { FontAwesome } from '@expo/vector-icons';

// Sample locations data - you can replace these with your actual locations
const locations = [
  { id: 1, name: 'Location 1' },
  { id: 2, name: 'Location 2' },
  { id: 3, name: 'Location 3' },
  { id: 4, name: 'Location 4' },
  { id: 5, name: 'Location 5' },
  { id: 6, name: 'Location 6' },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <LocationTracker />
      
      <View style={styles.locationsContainer}>
        {locations.map((location) => (
          <TouchableOpacity key={location.id} style={styles.locationBox}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle} />
            </View>
            
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>{location.name}</Text>
            </View>
            
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsNumber}>123</Text>
              <Text style={styles.pointsLabel}>points</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  locationsContainer: {
    padding: 16,
  },
  locationBox: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2089dc',
  },
  locationInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pointsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2089dc',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 