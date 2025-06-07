import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';

export default function LocationTransactionsScreen() {
  const route = useRoute();
  const { locationId } = route.params; // Receive locationId
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (locationId) {
      fetchTransactions();
    }
  }, [locationId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Fetch transactions for the specific location
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          customer_name,
          status,
          items:transaction_items (
            quantity,
            price_at_time,
            menu_item:menu_items (
              name
            )
          )
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching location transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
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
      <Text style={styles.title}>Recent Transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions found for this location.</Text>
      ) : (
        transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.customerName}>{transaction.customer_name}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at).toLocaleString()}
              </Text>
              {transaction.items && transaction.items.map(item => (
                <Text key={item.menu_item.name} style={styles.itemText}>
                  {item.quantity} x {item.menu_item.name} @ ${(item.price_at_time * item.quantity / 100).toFixed(2)}
                </Text>
              ))}
            </View>
            <Text style={styles.totalAmount}>${(transaction.amount / 100).toFixed(2)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    padding: 16,
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
    backgroundColor: COLORS.surface.primary,
  },
  errorText: {
    color: COLORS.text.error,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.primary,
  },
  transactionInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  itemText: {
    fontSize: 14,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 