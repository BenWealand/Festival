import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

export default function CustomersScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [contentHeight, setContentHeight] = useState(0);

  // Radial gradients for background
  const radialGradients = useMemo(() => [
    { id: 'cust-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'cust-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get location ID for the owner
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (locationError) throw locationError;

      // Fetch customer transactions
      const { data: customerData, error: customerError } = await supabase
        .from('transactions')
        .select(`
          customer_name,
          amount,
          created_at,
          status
        `)
        .eq('location_id', location.id)
        .order('created_at', { ascending: false });

      if (customerError) throw customerError;

      console.log('Raw transaction data:', customerData?.slice(0, 3)); // Debug log

      // Get unique customer names from transactions
      const customerNames = [...new Set(customerData.map(t => t.customer_name))];

      // Separate UUIDs and emails
      const uuids = customerNames.filter(name => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name));
      const emails = customerNames.filter(name => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name));

      // Fetch profiles for UUIDs
      const { data: uuidProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uuids);

      // Fetch profiles for emails
      const { data: emailProfiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('email', emails);

      // Combine profiles
      const profiles = [...(uuidProfiles || []), ...(emailProfiles || [])];

      // Process customer data
      const customerMap = new Map();
      customerData.forEach(transaction => {
        if (!customerMap.has(transaction.customer_name)) {
          const profile = profiles?.find(p =>
            p.id === transaction.customer_name || p.email === transaction.customer_name
          );
          customerMap.set(transaction.customer_name, {
            id: transaction.customer_name,
            name: profile?.full_name || transaction.customer_name,
            totalDeposited: 0,
            totalRedeemed: 0,
            lastVisit: null,
            transactionCount: 0,
            transactions: []
          });
        }
        
        const customer = customerMap.get(transaction.customer_name);
        customer.transactionCount++;
        customer.transactions.push(transaction);
        
        // Separate deposits and redemptions based on actual status values
        if (transaction.status === 'complete' || transaction.status === 'completed') {
          customer.totalDeposited += transaction.amount;
        } else if (transaction.status === 'redeemed') {
          customer.totalRedeemed += transaction.amount;
        }
        
        const transactionDate = new Date(transaction.created_at);
        if (!customer.lastVisit || transactionDate > customer.lastVisit) {
          customer.lastVisit = transactionDate;
        }
      });

      // Convert to array and sort by total deposited
      const sortedCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalDeposited - a.totalDeposited);

      console.log('Processed customers:', sortedCustomers.slice(0, 2)); // Debug log
      setCustomers(sortedCustomers);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchCustomers()}
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
          <ScrollView style={{ flex: 1 }} onContentSizeChange={(w, h) => setContentHeight(h)}>
            <View style={{ padding: 16 }}>
              <GlassCard style={{ marginBottom: 16 }} borderRadius={16}>
                <Text style={styles.title}>All Customers</Text>
                <Text style={styles.subtitle}>{customers.length} customers with deposit & redemption history</Text>
                {customers.length === 0 && (
                  <Text style={styles.emptyText}>No customers found.</Text>
                )}
                {customers.map((customer, index) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.customerRow,
                      index < customers.length - 1 && styles.customerRowBorder
                    ]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => {
                      console.log('Touch detected! Attempting to navigate to CustomerDetails with customer:', customer.id);
                      if (customer && customer.id) {
                        try {
                          navigation.navigate('CustomerDetails', {
                            customer: {
                              ...customer,
                              lastVisit: customer.lastVisit ? customer.lastVisit.toISOString() : null,
                              transactions: customer.transactions || []
                            }
                          });
                        } catch (navError) {
                          console.error('Navigation error:', navError);
                          // Fallback: try to navigate to a different screen or show an alert
                          alert('Unable to open customer details. Please try again.');
                        }
                      }
                    }}
                  >
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{customer.name}</Text>
                      <Text style={styles.customerMeta}>
                        {customer.transactionCount} {customer.transactionCount === 1 ? 'transaction' : 'transactions'}
                      </Text>
                    </View>
                    <View style={styles.customerStats}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Deposited:</Text>
                        <Text style={[styles.depositedAmount, { color: '#fff' }]}>{formatAmount(customer.totalDeposited)}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Redeemed:</Text>
                        <Text style={[styles.redeemedAmount, { color: '#fff' }]}>-{formatAmount(customer.totalRedeemed)}</Text>
                      </View>
                      <Text style={styles.lastVisit}>Last: {formatDate(customer.lastVisit)}</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={COLORS.text.muted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaView>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.text.white,
    opacity: 0.7,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text.white,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 32,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  customerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  customerInfo: {
    flex: 2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.white,
    marginBottom: 2,
  },
  customerMeta: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.7,
  },
  customerStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.7,
    marginRight: 4,
  },
  depositedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  redeemedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  lastVisit: {
    fontSize: 13,
    color: COLORS.text.white,
    opacity: 0.7,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
}); 