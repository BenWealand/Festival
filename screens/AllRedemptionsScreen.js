import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

export default function AllRedemptionsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [sort, setSort] = useState('recency'); // 'recency' | 'amount'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Radial gradients for background
  const radialGradients = useMemo(() => [
    { id: 'red-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'red-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // First check if user is an owner
        const { data: ownedLocation, error: ownerError } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (ownerError && ownerError.code !== 'PGRST116') {
          throw ownerError;
        }

        if (!ownedLocation) {
          setError('No business location found');
          setLoading(false);
          return;
        }

        // Fetch all transactions for this location
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            id,
            amount,
            created_at,
            customer_name,
            status
          `)
          .eq('location_id', ownedLocation.id)
          .order('created_at', { ascending: false });

        if (transactionsError) throw transactionsError;

        // Fetch user names for transactions
        const transactionUserIds = transactionsData?.map(t => t.customer_name).filter(Boolean) || [];
        const { data: transactionProfiles, error: transactionProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', transactionUserIds);

        if (transactionProfilesError) throw transactionProfilesError;

        // Map user names to transactions
        const transactionsWithNames = transactionsData?.map(transaction => ({
          ...transaction,
          user_name: transactionProfiles?.find(p => p.id === transaction.customer_name)?.full_name || 'Unknown Customer'
        })) || [];

        setTransactions(transactionsWithNames);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  // Filter and sort
  const filtered = useMemo(() => {
    let arr = transactions;
    if (search) {
      arr = arr.filter(t => (t.user_name || '').toLowerCase().includes(search.toLowerCase()));
    }
    arr = [...arr].sort((a, b) => {
      if (sort === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else {
        // recency
        return sortDir === 'asc'
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      }
    });
    return arr;
  }, [transactions, sort, sortDir, search]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BACKGROUND_BASE, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.text.white }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: BACKGROUND_BASE, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: COLORS.error, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity 
          style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 }}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Re-fetch data
            const fetchTransactions = async () => {
              // ... same logic as above
            };
            fetchTransactions();
          }}
        >
          <Text style={{ color: COLORS.text.white, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <SafeAreaViewContext style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          <ScrollView style={{ flex: 1 }} onContentSizeChange={(w, h) => setContentHeight(h)}>
            <View style={{ padding: 16 }}>
              {/* Search Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 16, paddingHorizontal: 12 }}>
                <FontAwesome name="search" size={16} color={COLORS.text.white} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: COLORS.text.white, fontSize: 16, paddingVertical: 8 }}
                  placeholder="Search by name..."
                  placeholderTextColor={COLORS.text.white}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              {/* Sorting Controls */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, marginRight: 8, backgroundColor: sort === 'recency' ? COLORS.primary : 'rgba(255,255,255,0.08)', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => {
                    setSort('recency');
                    setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  <Text style={{ color: COLORS.text.white, fontWeight: '600' }}>
                    {sort === 'recency' && sortDir === 'desc' ? 'Newest to Oldest' : 'Oldest to Newest'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, marginLeft: 8, backgroundColor: sort === 'amount' ? COLORS.primary : 'rgba(255,255,255,0.08)', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => {
                    setSort('amount');
                    setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  <Text style={{ color: COLORS.text.white, fontWeight: '600' }}>
                    {sort === 'amount' && sortDir === 'desc' ? 'High to Low' : 'Low to High'}
                  </Text>
                </TouchableOpacity>
              </View>
              <GlassCard style={{ marginBottom: 16 }} borderRadius={16}>
                <Text style={{ color: COLORS.text.white, fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>All Redemptions</Text>
                {filtered.map((tx, index) => (
                  <View 
                    key={tx.id} 
                    style={[
                      styles.redemptionItem,
                      index < filtered.length - 1 && styles.redemptionItemBorder
                    ]}
                  >
                    <View style={styles.redemptionInfo}>
                      <Text style={styles.redemptionCustomer}>{tx.user_name}</Text>
                      <Text style={styles.redemptionDate}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.redemptionStatus}>{tx.status.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.redemptionAmount}>
                      <Text style={styles.amountText}>-${(tx.amount / 100).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
                {filtered.length === 0 && (
                  <Text style={{ color: COLORS.text.white, opacity: 0.7, textAlign: 'center', marginTop: 32 }}>No redemptions found.</Text>
                )}
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaViewContext>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface.card,
    color: COLORS.text.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 15,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 4,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sortDirButton: {
    marginLeft: 4,
    padding: 6,
  },
  redemptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  redemptionInfo: {
    flex: 1,
  },
  redemptionCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 4,
  },
  redemptionDate: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.7,
  },
  redemptionStatus: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.7,
    marginTop: 2,
  },
  redemptionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  redemptionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
}); 