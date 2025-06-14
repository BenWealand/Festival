import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { YOUR_BACKEND_API_URL } from '@env';

export default function ActiveOrdersScreen() {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [showBartenderModal, setShowBartenderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedBartender, setSelectedBartender] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Fetch locationId for this owner
  useFocusEffect(
    React.useCallback(() => {
      const fetchLocation = async () => {
        if (!user?.id) return;
        const { data: location, error } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        if (!error && location) setLocationId(location.id);
      };
      fetchLocation();
    }, [user])
  );

  // Fetch employees for bartender selection
  const fetchEmployees = async (locId) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locId);
    if (!error) setEmployees(data || []);
  };

  // Fetch active orders
  const fetchActiveOrders = async (locId) => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, employees(*), transaction_items(*, menu_items(*))')
        .eq('location_id', locId)
        .in('status', ['in_progress', 'complete'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      setActiveOrders(data || []);
    } catch (err) {
      setOrdersError('Failed to load active orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (locationId) {
        fetchActiveOrders(locationId);
        fetchEmployees(locationId);
      }
    }, [locationId])
  );

  // Mark as complete handler
  const handleMarkComplete = (order) => {
    setSelectedOrder(order);
    setShowBartenderModal(true);
  };

  const confirmMarkComplete = async () => {
    if (!selectedOrder || !selectedBartender) return;
    setOrdersLoading(true);
    try {
      if (!YOUR_BACKEND_API_URL) {
        throw new Error('Backend URL is not set. Please set YOUR_BACKEND_API_URL in your .env file.');
      }
      const backendUrl = `${YOUR_BACKEND_API_URL}/complete-order`;
      const requestBody = { orderId: selectedOrder.id, bartenderId: selectedBartender };
      console.log('Submitting complete order to:', backendUrl);
      console.log('Request body:', requestBody);
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
      if (!res.ok) throw new Error((data && data.error) || 'Failed to mark order as complete');
      setShowBartenderModal(false);
      setSelectedOrder(null);
      setSelectedBartender(null);
      fetchActiveOrders(locationId);
    } catch (err) {
      console.log('Complete order error:', err);
      alert('Failed to mark order as complete');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Redeem handler
  const handleRedeem = async (orderId) => {
    setRedeemLoading(true);
    try {
      if (!YOUR_BACKEND_API_URL) {
        throw new Error('Backend URL is not set. Please set YOUR_BACKEND_API_URL in your .env file.');
      }
      const backendUrl = `${YOUR_BACKEND_API_URL}/redeem-order`;
      const requestBody = { orderId };
      console.log('Submitting redeem order to:', backendUrl);
      console.log('Request body:', requestBody);
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
      if (!res.ok) throw new Error((data && data.error) || 'Failed to redeem order');
      fetchActiveOrders(locationId);
    } catch (err) {
      console.log('Redeem order error:', err);
      alert('Failed to redeem order');
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface.primary }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.primary, margin: 16 }}>Active Orders</Text>
      {ordersLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : ordersError ? (
        <Text style={{ color: COLORS.error }}>{ordersError}</Text>
      ) : activeOrders.length === 0 ? (
        <Text style={{ color: COLORS.text.muted, marginLeft: 16 }}>No active orders.</Text>
      ) : (
        <ScrollView style={{ maxHeight: 300, marginHorizontal: 16 }}>
          {activeOrders.map(order => (
            <View key={order.id} style={{ backgroundColor: COLORS.surface.card, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Order #{order.id}</Text>
              <Text style={{ color: order.status === 'in_progress' ? COLORS.text.white : order.status === 'complete' ? COLORS.primary : order.status === 'redeemed' ? COLORS.secondary : COLORS.text.muted, fontWeight: 'bold' }}>
                Status: {order.status.replace('_', ' ')}
              </Text>
              <Text style={{ color: COLORS.text.white, marginTop: 4 }}>Items:</Text>
              {order.items && order.items.length > 0 && order.items.map((item, idx) => (
                <Text key={idx} style={{ color: COLORS.text.white, marginLeft: 8 }}>
                  {item.quantity}x {item.name} - ${((item.price * item.quantity) / 100).toFixed(2)}
                </Text>
              ))}
              <Text style={{ color: COLORS.text.white, marginTop: 4 }}>Tip: ${((order.tip_amount || 0) / 100).toFixed(2)}</Text>
              {order.status === 'in_progress' && (
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, marginTop: 8, alignItems: 'center' }}
                  onPress={() => handleMarkComplete(order)}
                >
                  <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
              {order.status === 'complete' && (
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.success, padding: 10, borderRadius: 8, marginTop: 8, alignItems: 'center' }}
                  onPress={() => handleRedeem(order.id)}
                  disabled={redeemLoading}
                >
                  <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Redeem</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      {/* Bartender Selection Modal */}
      <Modal visible={showBartenderModal} transparent animationType="slide" onRequestClose={() => setShowBartenderModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: COLORS.surface.card, borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: COLORS.text.white, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Select Bartender</Text>
            {employees.map(emp => (
              <TouchableOpacity
                key={emp.id}
                style={{ padding: 12, backgroundColor: selectedBartender === emp.id ? COLORS.primary : COLORS.surface.secondary, borderRadius: 8, marginBottom: 8 }}
                onPress={() => setSelectedBartender(emp.id)}
              >
                <Text style={{ color: COLORS.text.white }}>{emp.name}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: COLORS.surface.secondary, padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 }}
                onPress={() => setShowBartenderModal(false)}
              >
                <Text style={{ color: COLORS.text.white }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={confirmMarkComplete}
                disabled={!selectedBartender}
              >
                <Text style={{ color: COLORS.text.white, fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 