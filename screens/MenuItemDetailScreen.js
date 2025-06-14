import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available
import { useAuth } from '../context/AuthContext'; // Assuming auth context is available

export default function MenuItemDetailScreen({ item, locationId, addToCart, setCurrentScreen }) {
  return (
    <View style={styles.container}>
      {/* Item Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <FontAwesome name="camera" size={50} color={COLORS.text.muted} />
      </View>

      <Text style={styles.itemName}>{item?.name || 'Item Name'}</Text>
      <Text style={styles.itemPrice}>${((item?.price || 0) / 100).toFixed(2)}</Text>

      {addToCart ? (
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => {
            addToCart(item);
            setCurrentScreen('LocationMenu');
          }}
        >
          <Text style={styles.buttonText}>Add to Order</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.purchaseButton, { backgroundColor: COLORS.surface.secondary }]} disabled>
          <Text style={styles.buttonText}>Add to Order (unavailable)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setCurrentScreen('LocationMenu')}
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