import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function LocationTransactionsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { locationId } = route.params;
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
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          status,
          items
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchTransactions()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={24} color={COLORS.text.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Transactions</Text>
      </View>
      <ScrollView style={styles.container}>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions found for this location.</Text>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
              </View>
              
              <View style={styles.transactionDetails}>
                {transaction.items && transaction.items.length > 0 ? (
                  transaction.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemText}>
                        {item.quantity}x {item.name}
                      </Text>
                      <Text style={styles.itemPrice}>
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>No items in this transaction</Text>
                )}
              </View>

              <View style={styles.transactionFooter}>
                <Text style={styles.statusText}>Status: {transaction.status}</Text>
                <Text style={styles.totalAmount}>Total: ${(transaction.amount / 100).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.text.white,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.text.muted,
  },
  transactionItem: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  transactionHeader: {
    marginBottom: 12,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  transactionDetails: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.text.white,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    color: COLORS.text.white,
    marginLeft: 8,
  },
  noItemsText: {
    fontSize: 14,
    color: COLORS.text.muted,
    fontStyle: 'italic',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
}); 