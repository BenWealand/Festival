import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import CartScreen from './CartScreen';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationMenuScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const locationId = route?.params?.locationId;
  const [location, setLocation] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const { user } = useAuth();

  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <FontAwesome name="arrow-left" size={16} color={COLORS.text.white} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.text.white, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (locationId) {
      fetchLocationAndMenu();
    } else {
      setLoading(false);
    }
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

  if (!locationId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No location selected. Please select a location from the appropriate screen.</Text>
      </View>
    );
  }

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

  // Add item to cart
  const addToCart = (item) => {
    setCart((prev) => {
      // If item already in cart, increment quantity
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity = (updated[idx].quantity || 1) + 1;
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={24} color={COLORS.text.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{location?.name || 'Menu'}</Text>
      </View>
      <ScrollView style={styles.container}>
        {/* Add button to view transactions */}
        <TouchableOpacity 
          style={styles.viewTransactionsButton}
          onPress={() => {
            console.log('Navigating to LocationTransactions', { locationId, userId: user?.id });
            navigation.navigate('LocationTransactions', { locationId: locationId, userId: user?.id });
          }}
        >
          <FontAwesome name="history" size={20} color={COLORS.text.white} />
          <Text style={styles.viewTransactionsButtonText}>View Recent Transactions</Text>
        </TouchableOpacity>

        {Object.entries(menuByCategory).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {items.map((item) => (
              <View key={item.id} style={[styles.menuItem, { flexDirection: 'row', alignItems: 'center' }]}> 
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => navigation.navigate('MenuItemDetail', { item, locationId, addToCart })}
                >
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.itemPrice}>${(item.price / 100).toFixed(2)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginLeft: 10, backgroundColor: COLORS.primary, padding: 8, borderRadius: 6 }}
                  onPress={() => addToCart(item)}
                >
                  <FontAwesome name="plus" size={16} color={COLORS.text.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {/* View Cart Button */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: COLORS.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            zIndex: 10,
          }}
          onPress={() => setShowCart(true)}
        >
          <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 18 }}>
            View Cart / Purchase Order ({cart.reduce((sum, i) => sum + (i.quantity || 1), 0)} items)
          </Text>
        </TouchableOpacity>
      )}
      {/* Cart Modal/Screen */}
      {showCart && (
        <CartScreen
          visible={showCart}
          onClose={() => setShowCart(false)}
          cart={cart}
          setCart={setCart}
          locationId={locationId}
        />
      )}
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
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