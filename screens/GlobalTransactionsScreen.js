import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GlobalTransactionsScreen({ navigation, route }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <FontAwesome name="arrow-left" size={16} color={COLORS.text.white} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.text.white, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('No user found');
      }

      console.log('Fetching transactions for user:', user.id, user.email);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          customer_name,
          status,
          items,
          location:locations (
            name
          )
        `)
        .or(`customer_name.eq.${user.id},customer_name.eq.${user.email}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Found transactions:', data?.length || 0);
      setTransactions(data || []);
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTransactions();
      }
    }, [user, fetchTransactions])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        <Text style={styles.headerTitle}>All Transactions</Text>
      </View>
      <ScrollView style={styles.container}>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions found.</Text>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <Text style={styles.locationName}>{transaction.location?.name || 'Unknown Location'}</Text>
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
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 4,
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
}); 