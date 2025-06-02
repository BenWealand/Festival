import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

export default function CustomersScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
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

      // Process customer data
      const customerMap = new Map();
      customerData.forEach(transaction => {
        if (!customerMap.has(transaction.customer_name)) {
          customerMap.set(transaction.customer_name, {
            name: transaction.customer_name,
            totalSpent: 0,
            lastVisit: null,
            transactionCount: 0,
            transactions: []
          });
        }
        
        const customer = customerMap.get(transaction.customer_name);
        customer.totalSpent += transaction.amount;
        customer.transactionCount++;
        customer.transactions.push(transaction);
        
        const transactionDate = new Date(transaction.created_at);
        if (!customer.lastVisit || transactionDate > customer.lastVisit) {
          customer.lastVisit = transactionDate;
        }
      });

      // Convert to array and sort by total spent
      const sortedCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent);

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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer List</Text>
        <Text style={styles.headerSubtitle}>{customers.length} total customers</Text>
      </View>

      {customers.map((customer, index) => (
        <TouchableOpacity 
          key={index}
          style={styles.customerCard}
          onPress={() => {
            if (customer && customer.name) {
              navigation.navigate('CustomerDetails', { 
                customer: {
                  ...customer,
                  transactions: customer.transactions || []
                }
              });
            }
          }}
        >
          <View style={styles.customerHeader}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerMeta}>
                {customer.transactionCount} {customer.transactionCount === 1 ? 'visit' : 'visits'}
              </Text>
            </View>
            <Text style={styles.customerAmount}>{formatAmount(customer.totalSpent)}</Text>
          </View>
          
          <View style={styles.customerFooter}>
            <Text style={styles.lastVisit}>
              Last visit: {formatDate(customer.lastVisit)}
            </Text>
            <FontAwesome name="chevron-right" size={16} color={COLORS.text.muted} />
          </View>
        </TouchableOpacity>
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
    padding: 16,
    backgroundColor: COLORS.surface.card,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  customerCard: {
    backgroundColor: COLORS.surface.card,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  customerMeta: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  customerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  customerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  lastVisit: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
}); 