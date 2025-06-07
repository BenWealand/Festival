import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';

export default function LocationMenuScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { locationId } = route.params;
  const [location, setLocation] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLocationAndMenu();
  }, [locationId]);

  const fetchLocationAndMenu = async () => {
    try {
      setLoading(true);
      
      // Fetch location details
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;
      setLocation(locationData);

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('location_id', locationId)
        .order('category', { ascending: true });

      if (menuError) throw menuError;
      setMenuItems(menuData || []);
    } catch (err) {
      console.error('Error fetching location and menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {location?.logo_url ? (
          <Image 
            source={{ uri: location.logo_url }} 
            style={styles.logo}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.locationName}>{location?.name}</Text>
      </View>

      {/* Add button to view transactions */}
      <TouchableOpacity 
        style={styles.viewTransactionsButton}
        onPress={() => navigation.navigate('LocationTransactions', { locationId: locationId })}
      >
        <FontAwesome name="history" size={20} color={COLORS.text.white} />
        <Text style={styles.viewTransactionsButtonText}>View Recent Transactions</Text>
      </TouchableOpacity>

      {Object.entries(menuByCategory).map(([category, items]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate('MenuItemDetail', { item, locationId })}
            >
              <View style={styles.menuItemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <Text style={styles.itemPrice}>${(item.price / 100).toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
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
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  locationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  viewTransactionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.secondary,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'center',
  },
  viewTransactionsButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  categorySection: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
}); 