import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { YOUR_BACKEND_API_URL } from '@env';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

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

  // Radial gradients for background
  const radialGradients = useMemo(() => [
    { id: 'active-orders-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'active-orders-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

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

  if (ordersLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading active orders...</Text>
      </View>
    );
  }

  if (ordersError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{ordersError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => locationId && fetchActiveOrders(locationId)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ padding: 16 }}>
              <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
                <Text style={styles.title}>Active Orders</Text>
                {activeOrders.length === 0 ? (
                  <Text style={styles.emptyText}>No active orders.</Text>
                ) : (
                  <View style={{ maxHeight: 400 }}>
                    {activeOrders.map(order => (
                      <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderId}>Order #{order.id}</Text>
                          <Text style={[
                            styles.orderStatus,
                            { color: order.status === 'in_progress' ? COLORS.text.white : order.status === 'complete' ? COLORS.primary : order.status === 'redeemed' ? COLORS.secondary : COLORS.text.muted }
                          ]}>
                            {order.status.replace('_', ' ')}
                          </Text>
                        </View>
                        
                        <View style={styles.itemsSection}>
                          <Text style={styles.sectionLabel}>Items:</Text>
                          {order.transaction_items && order.transaction_items.length > 0 && order.transaction_items.map((item, idx) => (
                            <Text key={idx} style={styles.itemText}>
                              {item.quantity}x {item.menu_items?.name || 'Unknown Item'} - ${((item.price * item.quantity) / 100).toFixed(2)}
                            </Text>
                          ))}
                        </View>
                        
                        <Text style={styles.tipText}>Tip: ${((order.tip_amount || 0) / 100).toFixed(2)}</Text>
                        
                        {order.status === 'in_progress' && (
                          <GlowingButton
                            text="Mark as Complete"
                            onPress={() => handleMarkComplete(order)}
                            buttonWidth={200}
                            buttonHeight={48}
                            style={{ marginTop: 12 }}
                          />
                        )}
                        {order.status === 'complete' && (
                          <GlowingButton
                            text="Redeem"
                            onPress={() => handleRedeem(order.id)}
                            buttonWidth={200}
                            buttonHeight={48}
                            style={{ marginTop: 12 }}
                            disabled={redeemLoading}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Bartender Selection Modal */}
        <Modal visible={showBartenderModal} transparent animationType="slide" onRequestClose={() => setShowBartenderModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="modal-bg-1" cx="30%" cy="30%" rx="60%" ry="60%">
                    <Stop offset="0%" stopColor={BACKGROUND_RADIAL} stopOpacity="0.8" />
                    <Stop offset="100%" stopColor={BACKGROUND_RADIAL} stopOpacity="0" />
                  </RadialGradient>
                  <RadialGradient id="modal-bg-2" cx="70%" cy="70%" rx="70%" ry="70%">
                    <Stop offset="0%" stopColor={BACKGROUND_RADIAL} stopOpacity="0.8" />
                    <Stop offset="100%" stopColor={BACKGROUND_RADIAL} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={BACKGROUND_BASE} />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#modal-bg-1)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#modal-bg-2)" />
              </Svg>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Bartender</Text>
                {employees.map(emp => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.employeeOption,
                      selectedBartender === emp.id && styles.selectedEmployee
                    ]}
                    onPress={() => setSelectedBartender(emp.id)}
                  >
                    <Text style={styles.employeeName}>{emp.name}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowBartenderModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      !selectedBartender && styles.disabledButton
                    ]}
                    onPress={confirmMarkComplete}
                    disabled={!selectedBartender}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_BASE,
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
    backgroundColor: BACKGROUND_BASE,
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    margin: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
  },
  title: {
    color: COLORS.text.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text.white,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 32,
  },
  orderCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    color: COLORS.text.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderStatus: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  itemsSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    color: COLORS.text.white,
    marginBottom: 4,
  },
  itemText: {
    color: COLORS.text.white,
    marginLeft: 8,
    marginBottom: 2,
  },
  tipText: {
    color: COLORS.text.white,
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 16,
  },
  modalTitle: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  employeeOption: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedEmployee: {
    backgroundColor: COLORS.primary,
  },
  employeeName: {
    color: COLORS.text.white,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: COLORS.text.white,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  confirmButtonText: {
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
}); 