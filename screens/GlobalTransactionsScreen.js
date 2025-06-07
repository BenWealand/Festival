import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function GlobalTransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Fetch all transactions for the current user across all locations
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          customer_name,
          status,
          location:locations (\n            name\n          ),\n          items:transaction_items (\n            quantity,\n            price_at_time,\n            menu_item:menu_items (\n              name\n            )\n          )\n        `)
        .eq('customer_name', user.email) // Assuming customer_name stores user email
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching global transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading all transactions...</Text>
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
      <Text style={styles.title}>All Recent Transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions found.</Text>
      ) : (
        transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.locationName}>{transaction.location?.name || 'Unknown Location'}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.created_at).toLocaleString()}
              </Text>
              {transaction.items && transaction.items.map(item => (
                <Text key={item.menu_item.name} style={styles.itemText}>\n                  {item.quantity} x {item.menu_item.name} @ ${((item.price_at_time * item.quantity) / 100).toFixed(2)}
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
    color: COLORS.error,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text.white,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.text.muted,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'space-between',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.text.white,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
}); 