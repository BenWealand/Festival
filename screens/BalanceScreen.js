import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { createPaymentIntentForLocation } from '../lib/stripe';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';

export default function BalanceScreen() {
  const navigation = useNavigation();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user, session } = useAuth();
  const [balances, setBalances] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all locations with stripe_account_id
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*, stripe_account_id')
        .order('created_at', { ascending: false });

      if (locationsError) throw locationsError;

      // Filter out locations without Stripe accounts
      const validLocations = locationsData.filter(location => location.stripe_account_id);

      // Fetch user's balances
      const { data: balancesData, error: balancesError } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', user.id);

      if (balancesError) throw balancesError;

      // Create a map of location_id to balance
      const balancesMap = balancesData.reduce((acc, balance) => {
        acc[balance.location_id] = balance.balance;
        return acc;
      }, {});

      setLocations(validLocations || []);
      setBalances(balancesMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchData();
      }
    }, [user, fetchData])
  );

  const validateAmount = (value) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const handleAddBalance = async () => {
    if (!selectedLocation || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount (e.g., 10.00)');
      return;
    }

    if (!selectedLocation.stripe_account_id) {
      Alert.alert('Error', 'This location is not set up to accept payments yet.');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Convert amount to cents
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      // Call backend to create Payment Intent
      console.log('User in BalanceScreen:', user);
      if (!user?.id) {
        Alert.alert('Error', 'User is not authenticated.');
        setProcessingPayment(false);
        return;
      }
      const { clientSecret } = await createPaymentIntentForLocation(selectedLocation.id, amountInCents, user.id);
      
      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: Constants.expoConfig.name || 'My App',
        style: 'automatic',
        appearance: {
          colors: {
            primary: COLORS.primary,
          },
        },
      });
      
      if (initError) {
        console.error("initPaymentSheet error:", initError);
        throw new Error(initError.message || 'Failed to initialize payment sheet');
      }
      
      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();
      
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log("Payment cancelled by user.");
          return;
        }
        console.error("presentPaymentSheet error:", paymentError);
        throw new Error(paymentError.message || 'Payment failed');
      }
      
      // Refresh data, close modal, reset state
      await fetchData();
      setShowModal(false);
      setAmount('');
      setSelectedLocation(null);

    } catch (error) {
      console.error('Error during payment process:', error);
      Alert.alert('Error', error.message || 'Failed to add balance');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {locations.map((location) => (
            <View key={location.id} style={styles.locationBox}>
              <View style={styles.locationHeader}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.balanceText}>
                  ${((balances[location.id] || 0) / 100).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedLocation(location);
                  setShowModal(true);
                }}
              >
                <FontAwesome name="plus" size={16} color={COLORS.text.white} />
                <Text style={styles.addButtonText}>Add Balance</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Balance</Text>
            <Text style={styles.modalSubtitle}>{selectedLocation?.name}</Text>
            
            <View style={styles.amountInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount (e.g., 10.00)"
                placeholderTextColor={COLORS.text.secondary}
                value={amount}
                onChangeText={(text) => setAmount(validateAmount(text))}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setAmount('');
                  setSelectedLocation(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddBalance}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator color={COLORS.text.white} />
                ) : (
                  <Text style={styles.buttonText}>Add Balance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    textAlign: 'center',
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
  scrollContent: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  locationBox: {
    width: '48%',
    backgroundColor: COLORS.surface.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationHeader: {
    marginBottom: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.text.white,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: COLORS.surface.secondary,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.white,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.surface.secondary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 