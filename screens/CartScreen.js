import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { COLORS } from '../constants/theme';
import Constants from 'expo-constants';
import { YOUR_BACKEND_API_URL } from '@env';
import { useAuth } from '../context/AuthContext';

const TIP_PRESETS = [10, 15, 20, 25];

export default function CartScreen({ visible, onClose, cart, setCart, locationId }) {
  const { user } = useAuth();
  const [tipPercent, setTipPercent] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const tip = customTip !== '' ? Math.round(Number(customTip) * 100) : Math.round(subtotal * tipPercent / 100);
  const total = subtotal + tip;

  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) } : item));
  };
  const removeItem = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmitOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!YOUR_BACKEND_API_URL) {
        throw new Error('Backend URL is not set. Please set YOUR_BACKEND_API_URL in your .env file.');
      }
      if (!user?.id) {
        throw new Error('User is not authenticated.');
      }
      const backendUrl = `${YOUR_BACKEND_API_URL}/create-transaction`;
      const requestBody = {
        userId: user.id,
        locationId,
        items: cart,
        tip,
      };
      console.log('Submitting order to:', backendUrl);
      console.log('Request body:', JSON.stringify(requestBody));
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      console.log('Fetch response status:', res.status);
      let data = null;
      try {
        data = await res.json();
        console.log('Fetch response data:', data);
      } catch (jsonErr) {
        console.log('Error parsing response JSON:', jsonErr);
      }
      if (!res.ok) throw new Error((data && data.error) || 'Failed to submit order');
      setCart([]);
      onClose();
      Alert.alert('Order Placed', 'Your order is in progress!');
    } catch (err) {
      console.log('Order submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.surface.primary, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text.white, marginBottom: 16 }}>Your Order</Text>
        <ScrollView style={{ flex: 1 }}>
          {cart.map(item => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: COLORS.text.white, flex: 1 }}>{item.name} x{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={{ marginHorizontal: 4 }}><Text style={{ color: COLORS.primary, fontSize: 18 }}>-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={{ marginHorizontal: 4 }}><Text style={{ color: COLORS.primary, fontSize: 18 }}>+</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginHorizontal: 4 }}><Text style={{ color: COLORS.error, fontSize: 18 }}>🗑️</Text></TouchableOpacity>
              <Text style={{ color: COLORS.text.white, marginLeft: 8 }}>${((item.price * item.quantity) / 100).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>
        <Text style={{ color: COLORS.text.white, fontSize: 16, marginTop: 12 }}>Subtotal: ${(subtotal / 100).toFixed(2)}</Text>
        <Text style={{ color: COLORS.text.white, fontSize: 16, marginTop: 12 }}>Tip:</Text>
        <View style={{ flexDirection: 'row', marginVertical: 8 }}>
          {TIP_PRESETS.map(percent => (
            <TouchableOpacity
              key={percent}
              style={{
                backgroundColor: tipPercent === percent ? COLORS.primary : COLORS.surface.secondary,
                padding: 8,
                borderRadius: 6,
                marginRight: 8,
              }}
              onPress={() => { setTipPercent(percent); setCustomTip(''); }}
            >
              <Text style={{ color: COLORS.text.white }}>{percent}%</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={{ backgroundColor: COLORS.surface.secondary, color: COLORS.text.white, borderRadius: 6, padding: 8, width: 80 }}
            placeholder="Custom $"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="numeric"
            value={customTip}
            onChangeText={val => { setCustomTip(val); setTipPercent(0); }}
          />
        </View>
        <Text style={{ color: COLORS.text.white, fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>Total: ${(total / 100).toFixed(2)}</Text>
        {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: COLORS.surface.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}
            onPress={handleSubmitOrder}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.text.white} /> : <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Submit Order</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 