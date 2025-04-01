import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import LocationTracker from '../components/LocationTracker';

// Sample locations data - you can replace these with your actual locations
const locations = [
  { id: 1, name: 'Location 1' },
  { id: 2, name: 'Location 2' },
  { id: 3, name: 'Location 3' },
  { id: 4, name: 'Location 4' },
  { id: 5, name: 'Location 5' },
  { id: 6, name: 'Location 6' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 cards per row with padding

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Locations</Text>
      <LocationTracker />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {locations.map((location) => (
            <View key={location.id} style={styles.card}>
              <Text style={styles.cardTitle}>{location.name}</Text>
              <View style={styles.cardContent}>
                {/* Placeholder for future content */}
                <Text style={styles.placeholder}>Details coming soon</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
  },
  placeholder: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
}); 