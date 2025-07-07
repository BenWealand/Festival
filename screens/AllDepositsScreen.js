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

export default function AllDepositsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [sort, setSort] = useState('recency'); // 'recency' | 'amount'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Radial gradients for background
  const radialGradients = useMemo(() => [
    { id: 'dep-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'dep-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

  useEffect(() => {
    const fetchDeposits = async () => {
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

        // Fetch all deposits for this location
        const { data: depositsData, error: depositsError } = await supabase
          .from('deposits')
          .select(`
            id,
            amount,
            created_at,
            user_id
          `)
          .eq('location_id', ownedLocation.id)
          .order('created_at', { ascending: false });

        if (depositsError) throw depositsError;

        // Fetch user names for deposits
        const depositUserIds = depositsData?.map(d => d.user_id).filter(Boolean) || [];
        const { data: depositProfiles, error: depositProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', depositUserIds);

        if (depositProfilesError) throw depositProfilesError;

        // Map user names to deposits
        const depositsWithNames = depositsData?.map(deposit => ({
          ...deposit,
          user_name: depositProfiles?.find(p => p.id === deposit.user_id)?.full_name || 'Unknown Customer'
        })) || [];

        setDeposits(depositsWithNames);
      } catch (err) {
        console.error('Error fetching deposits:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, [user]);

  // Filter and sort
  const filtered = useMemo(() => {
    let arr = deposits;
    if (search) {
      arr = arr.filter(d => (d.user_name || '').toLowerCase().includes(search.toLowerCase()));
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
  }, [deposits, sort, sortDir, search]);

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
            const fetchDeposits = async () => {
              // ... same logic as above
            };
            fetchDeposits();
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
                <Text style={{ color: COLORS.text.white, fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>All Deposits</Text>
                {filtered.map((deposit, index) => (
                  <View 
                    key={deposit.id} 
                    style={[
                      styles.depositItem,
                      index < filtered.length - 1 && styles.depositItemBorder
                    ]}
                  >
                    <View style={styles.depositInfo}>
                      <Text style={styles.depositCustomer}>{deposit.user_name}</Text>
                      <Text style={styles.depositDate}>
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.depositAmount}>
                      <Text style={styles.amountText}>+${(deposit.amount / 100).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
                {filtered.length === 0 && (
                  <Text style={{ color: COLORS.text.white, opacity: 0.7, textAlign: 'center', marginTop: 32 }}>No deposits found.</Text>
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
  depositItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  depositInfo: {
    flex: 1,
  },
  depositCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 4,
  },
  depositDate: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.7,
  },
  depositAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  depositItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
}); 