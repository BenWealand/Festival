import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, withSpring, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
// import { PanGestureHandler } from 'react-native-gesture-handler';

// CardStack for Apple Wallet-style UI
function CardStack({ data, onCardPress }) {
  const CARD_HEIGHT = 220;
  const CARD_HEADER_HEIGHT = 70;
  const CARD_OFFSET = 55;
  const CARD_BORDER_RADIUS = 18;
  const CARD_MARGIN = 16;
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Reverse the data so the last card is rendered last (on top)
  const reversedData = [...data].reverse();

  const CARD_GRADIENTS = [
    ['#f7b733', '#fc4a1a'], // orange to red
    ['#43cea2', '#185a9d'], // green to blue
    ['#ffaf7b', '#d76d77'], // peach to pink
    ['#43e97b', '#38f9d7'], // green to teal
    ['#fa709a', '#fee140'], // pink to yellow
    ['#30cfd0', '#330867'], // teal to purple
    ['#f7971e', '#ffd200'], // orange to yellow
    ['#c471f5', '#fa71cd'], // purple to pink
  ];

  const CardItem = ({ item, index }) => {
    // index is for reversedData, so 0 is the bottom card (fully visible)
    const originalIndex = data.length - 1 - index;
    const animatedStyle = useAnimatedStyle(() => {
      let top = index * CARD_OFFSET;
      let height = CARD_HEIGHT;
      let zIndex = index;
      let scale = 1;
      let boxShadow = 6;
      let visible = true;

      if (expandedIndex === originalIndex) {
        top = 0;
        zIndex = 999;
        scale = 1.04;
        boxShadow = 12;
      } else if (expandedIndex !== null && expandedIndex !== originalIndex) {
        // Hide all other cards when one is expanded
        visible = false;
      }

      return {
        position: 'absolute',
        left: CARD_MARGIN,
        right: CARD_MARGIN,
        top,
        height: CARD_HEIGHT,
        zIndex,
        transform: [{ scale }],
        elevation: boxShadow,
        opacity: visible ? 1 : 0,
      };
    }, [expandedIndex]);

    return (
      <Animated.View
        style={[
          {
            borderRadius: CARD_BORDER_RADIUS,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: CARD_BORDER_RADIUS }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.95}
            onPress={() => {
              if (expandedIndex === originalIndex) {
                setExpandedIndex(null); // Collapse
              } else {
                setExpandedIndex(originalIndex); // Expand
              }
            }}
          >
            <View style={{ flex: 1 }}>
              {/* Header: Always visible */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: CARD_HEADER_HEIGHT, justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text.white, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.text.muted, marginLeft: 12, fontWeight: '600', flexShrink: 0 }} numberOfLines={1} ellipsizeMode="tail">
                  ${(item.points / 100).toFixed(2)}
                </Text>
              </View>
              {/* Expanded details: Only visible when expanded */}
              {expandedIndex === originalIndex && (
                <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  {item.logo_url ? (
                    <Image
                      source={{ uri: item.logo_url }}
                      style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }}
                    />
                  ) : null}
                  <Text style={{ color: COLORS.text.white, fontSize: 16, textAlign: 'center' }}>
                    More details can go here!
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Container height for stacking
  const containerHeight = CARD_HEIGHT + (reversedData.length - 1) * CARD_OFFSET + 2 * CARD_MARGIN;

  return (
    <View style={{ height: containerHeight, marginTop: 32, backgroundColor: COLORS.surface.primary }}>
      {reversedData.map((item, index) => (
        <CardItem item={item} index={index} key={item.id} />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [businessData, setBusinessData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentDeposits, setRecentDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching data for user:', user?.id);
      
      // First check if user is an owner
      const { data: ownedLocation, error: ownerError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user?.id)
        .single();

      console.log('Owner check result:', { ownedLocation, ownerError });

      if (ownerError && ownerError.code !== 'PGRST116') {
        throw ownerError;
      }

      setIsOwner(!!ownedLocation);
      console.log('isOwner set to:', !!ownedLocation);

      if (ownedLocation) {
        // Fetch business data for owners
        const { data: business, error: businessError } = await supabase
          .from('locations')
          .select(`
            id,
            name,
            logo_url,
            business_metrics (
              total_revenue,
              total_transactions,
              average_rating
            )
          `)
          .eq('id', ownedLocation.id)
          .single();

        if (businessError) throw businessError;

        // Fetch total balance for the location
        const { data: totalBalanceData, error: totalBalanceError } = await supabase
          .from('balances')
          .select('balance')
          .eq('location_id', ownedLocation.id);

        if (totalBalanceError) throw totalBalanceError;

        const amountLeftToRedeem = totalBalanceData.reduce((sum, item) => sum + item.balance, 0);

        // Fetch recent transactions
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            id,
            amount,
            created_at,
            customer_name,
            status
          `)
          .eq('location_id', business.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (transactionsError) throw transactionsError;

        // Fetch user names for transactions
        const transactionUserIds = transactions.map(t => t.customer_name);
        const { data: transactionProfiles, error: transactionProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', transactionUserIds);

        if (transactionProfilesError) throw transactionProfilesError;

        // Map user names to transactions
        const transactionsWithNames = transactions.map(transaction => ({
          ...transaction,
          user_name: transactionProfiles?.find(p => p.id === transaction.customer_name)?.full_name || 'Unknown Customer'
        }));

        // Fetch total deposits for the location
        const { data: totalDepositsData, error: totalDepositsError } = await supabase
          .from('deposits')
          .select('amount')
          .eq('location_id', ownedLocation.id);

        if (totalDepositsError) throw totalDepositsError;

        const totalRevenueDeposits = totalDepositsData.reduce((sum, item) => sum + item.amount, 0);

        // Fetch recent deposits
        const { data: recentDeposits, error: recentDepositsError } = await supabase
          .from('deposits')
          .select(`
            id,
            amount,
            created_at,
            user_id
          `)
          .eq('location_id', ownedLocation.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentDepositsError) throw recentDepositsError;

        // Fetch user names for deposits
        const depositUserIds = recentDeposits.map(d => d.user_id);
        const { data: depositProfiles, error: depositProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', depositUserIds);

        if (depositProfilesError) throw depositProfilesError;

        // Map user names to deposits
        const depositsWithNames = recentDeposits.map(deposit => ({
          ...deposit,
          user_name: depositProfiles?.find(p => p.id === deposit.user_id)?.full_name || 'Unknown Customer'
        }));

        setBusinessData({
          ...business,
          amount_redeemed: business.business_metrics?.total_revenue || 0,
          total_transactions: business.business_metrics?.total_transactions || 0,
          average_rating: business.business_metrics?.average_rating || 0,
          amount_left_to_redeem: amountLeftToRedeem,
          total_revenue_deposits: totalRevenueDeposits,
        });
        setRecentTransactions(transactionsWithNames);
        setRecentDeposits(depositsWithNames);
      } else {
        // For non-owners, fetch their locations and points
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user?.id)
          .single();

        if (profileError) throw profileError;

        const { data: locations, error: locationsError } = await supabase
          .from('locations')
          .select(`
            id,
            name,
            logo_url,
            balances!inner (
              balance
            )
          `)
          .eq('balances.user_id', profile.id)
          .order('id', { ascending: true });

        if (locationsError) throw locationsError;

        setBusinessData({
          locations: locations.map(location => ({
            id: location.id,
            name: location.name,
            logo_url: location.logo_url,
            points: location.balances[0]?.balance || 0
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error.message}`);
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

  if (loading) {
    console.log('Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setLoading(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('Rendering main view:', { isOwner, businessData });

  // Render business owner dashboard
  if (isOwner) {
    const QuickAction = ({ icon, title, onPress }) => (
      <TouchableOpacity style={styles.quickAction} onPress={onPress}>
        <FontAwesome name={icon} size={24} color={COLORS.text.white} />
        <Text style={styles.quickActionText}>{title}</Text>
      </TouchableOpacity>
    );

    return (
      <ScrollView style={styles.container}>
        {/* Business Header */}
        <View style={styles.header}>
          {businessData?.logo_url ? (
            <Image 
              source={{ uri: businessData.logo_url }} 
              style={styles.logo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <FontAwesome name="building" size={32} color={COLORS.text.white} />
            </View>
          )}
          <Text style={styles.businessName}>{businessData?.name}</Text>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${(businessData?.total_revenue_deposits / 100 || 0).toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Total Revenue (Deposits)</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${(businessData?.amount_left_to_redeem / 100 || 0).toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Left to Redeem</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{businessData?.total_transactions || 0}</Text>
            <Text style={styles.metricLabel}>Total Redemptions</Text>
          </View>
        </View>

        {/* Note about Amount Redeemed */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>Amount Redeemed refers to the total value of items purchased using customer balances.</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="plus-circle" 
              title="Add Item" 
              onPress={() => navigation.navigate('BusinessMenu')}
            />
            <QuickAction 
              icon="users" 
              title="Customers" 
              onPress={() => navigation.navigate('Customers')}
            />
            <QuickAction 
              icon="bar-chart" 
              title="Analytics" 
              onPress={() => navigation.navigate('Analytics')}
            />
            <QuickAction 
              icon="cog" 
              title="Settings" 
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Recent Deposits */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Deposits</Text>
          {recentDeposits.length === 0 ? (
            <Text style={styles.emptyText}>No recent deposits.</Text>
          ) : (
            recentDeposits.map((deposit) => (
              <View key={deposit.id} style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCustomer}>User: {deposit.user_name}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={styles.amountText}>+${(deposit.amount / 100).toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Redemptions */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Redemptions</Text>
          {recentTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No recent redemptions.</Text>
          ) : (
            recentTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id}
                style={styles.transactionItem}
                onPress={() => {
                  if (transaction.status === 'completed' && !transaction.rating) {
                    navigation.navigate('TransactionRating', { 
                      transactionId: transaction.id,
                      transaction: transaction
                    });
                  } else {
                    navigation.navigate('TransactionDetails', { transactionId: transaction.id });
                  }
                }}
              >
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCustomer}>{transaction.user_name}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={styles.amountText}>-${(transaction.amount / 100).toFixed(2)}</Text>
                  <View style={styles.transactionStatus}>
                    <Text style={[
                      styles.statusText,
                      { color: transaction.status === 'completed' ? COLORS.success : COLORS.warning }
                    ]}>
                      {transaction.status}
                    </Text>
                    {transaction.status === 'completed' && !transaction.rating && (
                      <Text style={styles.ratePrompt}>Tap to rate</Text>
                    )}
                    {transaction.rating && (
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesome
                            key={star}
                            name={star <= transaction.rating ? "star" : "star-o"}
                            size={12}
                            color={COLORS.primary}
                            style={styles.ratingStar}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // Render customer view
  if (!isOwner) {
    return (
      <View style={styles.container}>
        {businessData?.locations?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="map-marker" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No locations available</Text>
          </View>
        ) : (
          <CardStack
            data={businessData.locations}
            onCardPress={(location) => navigation.navigate('LocationMenu', { locationId: location.id })}
          />
        )}
      </View>
    );
  }
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
    color: COLORS.text.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
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
  // Business Owner Styles
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface.card,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface.card,
    marginTop: 1,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  noteContainer: {
    padding: 16,
    backgroundColor: COLORS.surface.card,
    marginTop: 16,
  },
  noteText: {
    color: COLORS.text.muted,
    fontSize: 14,
  },
  quickActionsContainer: {
    padding: 16,
    backgroundColor: COLORS.surface.card,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    backgroundColor: COLORS.surface.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionText: {
    color: COLORS.text.white,
    marginTop: 8,
    fontSize: 14,
  },
  transactionsContainer: {
    padding: 16,
    backgroundColor: COLORS.surface.card,
    marginTop: 16,
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  ratePrompt: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  ratingStar: {
    marginLeft: 2,
  },
  // Customer View Styles
  locationsContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: COLORS.text.muted,
    fontSize: 16,
    marginTop: 16,
  },
  locationBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  locationInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  pointsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
}); 