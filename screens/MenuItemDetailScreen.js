import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available
import { useAuth } from '../context/AuthContext'; // Assuming auth context is available

export default function MenuItemDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { item, locationId } = route.params; // Receive item data and locationId
  const { user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to purchase items.');
      return;
    }

    if (!locationId || !item?.id || !item?.price) {
        Alert.alert('Error', 'Missing item or location information.');
        return;
    }

    setIsPurchasing(true);
    try {
        // --- Use the Supabase purchase_item function for atomic operation ---
        const { data, error } = await supabase.rpc('purchase_item', {
            p_user_id: user.id,
            p_location_id: locationId,
            p_item_id: item.id,
            p_item_price: item.price, // Assuming price is stored in cents
            p_item_name: item.name
        });

        if (error) {
            // Check for the specific insufficient balance error from the function
            if (error.message === 'Insufficient Balance') {
                Alert.alert('Insufficient Balance', 'You do not have enough balance to purchase this item.');
            } else {
                throw error; // Rethrow other errors
            }
        } else {
            Alert.alert('Success', `${item.name} purchased successfully!`);
            // Optionally navigate back or update UI
            navigation.goBack();
        }

    } catch (error) {
      console.error('Error during purchase:', error);
      Alert.alert('Purchase Failed', error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Item Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <FontAwesome name="camera" size={50} color={COLORS.text.muted} />
      </View>

      <Text style={styles.itemName}>{item?.name || 'Item Name'}</Text>
      <Text style={styles.itemPrice}>${((item?.price || 0) / 100).toFixed(2)}</Text>

      <TouchableOpacity 
        style={styles.purchaseButton}
        onPress={handlePurchase}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <ActivityIndicator color={COLORS.text.white} />
        ) : (
          <Text style={styles.buttonText}>Purchase</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    alignItems: 'center',
    padding: 20,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 20,
    color: COLORS.primary,
    marginBottom: 30,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: COLORS.surface.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 