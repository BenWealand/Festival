import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Button } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, withSpring, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { PanGestureHandler } from 'react-native-gesture-handler';

// CardStack for Apple Wallet-style UI
function CardStack({ data, onCardPress }) {
  const navigation = useNavigation();
  const CARD_HEIGHT = 220;
  const CARD_HEADER_HEIGHT = 70;
  const CARD_OFFSET = 65;
  const CARD_BORDER_RADIUS = 12;
  const CARD_MARGIN = 12;
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [expandedTransactions, setExpandedTransactions] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState(null);

  // Add the coming soon card as the first item in the stack
  const stackData = [
    { id: '__coming_soon__', name: 'More Locations Coming Soon!', isComingSoon: true },
    ...data
  ];
  const reversedData = [...stackData].reverse();

  const CARD_GRADIENTS = [
    ['#e6a02e', '#e64a1a'], // softer orange to red
    ['#3db890', '#145a9d'], // softer green to blue
    ['#e69f7b', '#c76d77'], // softer peach to pink
    ['#3db97b', '#28d9c7'], // softer green to teal
    ['#6a8dad', '#7fa6c7', '#b2cbe4'], // less vibrant blue gradient
    ['#20afb0', '#230867'], // softer teal to purple
    ['#d7871e', '#e6c200'], // softer orange to yellow
    ['#b461d5', '#da61bd'], // softer purple to pink
  ];

  const CardItem = ({ item, index }) => {
    // index is for reversedData, so 0 is the bottom card (fully visible)
    const animatedStyle = useAnimatedStyle(() => {
      let top = index * CARD_OFFSET;
      let height = CARD_HEIGHT;
      let zIndex = index;
      let scale = 1;
      let boxShadow = 6;
      let visible = true;

      if (expandedIndex === index) {
        top = 0;
        zIndex = 999;
        scale = 1.04;
        boxShadow = 12;
      } else if (expandedIndex !== null && expandedIndex !== index) {
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

    const isExpanded = expandedIndex === index;
    const isAnyExpanded = expandedIndex !== null;
    return (
      <Animated.View
        pointerEvents={isAnyExpanded && !isExpanded ? 'none' : 'auto'}
        style={[
          {
            borderRadius: CARD_BORDER_RADIUS,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: CARD_MARGIN,
            marginHorizontal: CARD_MARGIN,
            backgroundColor: COLORS.surface.card,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={item.isComingSoon ? ['#ff4e8e', '#ff6bb5'] : CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: CARD_BORDER_RADIUS }}
        >
          <TouchableOpacity
            style={{ flex: 1, borderRadius: CARD_BORDER_RADIUS }}
            activeOpacity={0.95}
            onPress={() => {
              if (!item.isComingSoon) {
                if (expandedIndex === index) {
                  setExpandedIndex(null); // Collapse
                } else {
                  setExpandedIndex(index); // Expand
                  // Fetch recent transactions for this location
                  setExpandedLoading(true);
                  setExpandedError(null);
                  setExpandedTransactions([]);
                  fetchRecentTransactions(item.id);
                }
              }
            }}
          >
            <View style={{ flex: 1, borderRadius: CARD_BORDER_RADIUS }}>
              {item.isComingSoon ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.text.white, textAlign: 'center' }}>
                    {item.name}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: CARD_HEADER_HEIGHT }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text.white, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 16, color: COLORS.text.white, marginLeft: 12, fontWeight: '700', flexShrink: 0 }} numberOfLines={1} ellipsizeMode="tail">
                      ${(item.points / 100).toFixed(2)}
                    </Text>
                  </View>
                  {/* Expanded details: Only visible when expanded */}
                  {expandedIndex === index && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      {item.logo_url ? (
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface.primary, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
                          <Image
                            source={{ uri: item.logo_url }}
                            style={{ width: 64, height: 64, borderRadius: 32 }}
                          />
                        </View>
                      ) : null}
                    </View>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Fetch recent transactions for a location
  const fetchRecentTransactions = async (locationId) => {
    try {
      setExpandedLoading(true);
      setExpandedError(null);
      const { data, error } = await supabase
        .from('transactions')
        .select(`id, amount, created_at, customer_name, status, items`)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setExpandedTransactions(data);
    } catch (err) {
      setExpandedError('Failed to load recent transactions');
    } finally {
      setExpandedLoading(false);
    }
  };

  // Container height for stacking
  const containerHeight = CARD_HEIGHT + (reversedData.length - 1) * CARD_OFFSET + 2 * CARD_MARGIN;

  return (
    <View style={{ marginTop: 32, backgroundColor: COLORS.surface.primary }}>
      <View style={{ height: containerHeight }}>
        {reversedData.map((item, index) => (
          <React.Fragment key={item.id}>
            <CardItem item={item} index={index} />
            {/* Expanded card details immediately below the expanded card */}
            {expandedIndex === index && !item.isComingSoon && (
              <View style={{ marginTop: 250, marginHorizontal: CARD_MARGIN }}>
                {/* Recent Transactions Row */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text.white, marginBottom: 8 }}>Recent Transactions</Text>
                  {expandedLoading ? (
                    <ActivityIndicator size="small" color={COLORS.text.white} />
                  ) : expandedError ? (
                    <Text style={{ color: COLORS.error }}>{expandedError}</Text>
                  ) : expandedTransactions.length === 0 ? (
                    <Text style={{ color: COLORS.text.muted }}>No recent transactions.</Text>
                  ) : (
                    expandedTransactions.slice(0, 2).map((tx) => (
                      <View key={tx.id} style={{ borderRadius: 8, padding: 6, marginBottom: 5, backgroundColor: COLORS.surface.card, minHeight: 20, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                          {/* Only show status if not completed */}
                          {tx.status !== 'completed' && (
                            <Text style={[
                              styles.statusText,
                              tx.status === 'redeemed'
                                ? { color: COLORS.secondary }
                                : tx.status === 'completed' || tx.status === 'complete'
                                ? { color: COLORS.primary }
                                : tx.status === 'in_progress'
                                ? { color: COLORS.text.white }
                                : { color: COLORS.text.muted }
                            ]}>
                              {tx.status.replace('_', ' ')}
                            </Text>
                          )}
                        </View>
                        {/* Show what was bought if items exist */}
                        {Array.isArray(tx.items) && tx.items.length > 0 && (
                          <View style={{ marginTop: 0 }}>
                            {tx.items.map((item, idx) => (
                              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1, minHeight: 18 }}>
                                <Text style={{ color: COLORS.text.muted, fontSize: 12, minWidth: 24, textAlign: 'left', flexShrink: 0 }}>{item.quantity}x</Text>
                                <Text style={{ color: COLORS.text.white, fontSize: 16, flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{item.name}</Text>
                                <Text style={{ color: COLORS.text.white, fontSize: 13, minWidth: 40, textAlign: 'right', fontWeight: 'bold' }}>${((item.price * item.quantity) / 100).toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {/* Show total price once per transaction, only if more than one item */}
                        {Array.isArray(tx.items) && tx.items.length > 1 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                            <Text style={{ color: COLORS.text.white, fontSize: 13, fontWeight: 'bold' }}>${(tx.amount / 100).toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
                {/* See all transactions link */}
                {expandedTransactions.length > 2 && (
                  <TouchableOpacity onPress={() => navigation.navigate('GlobalTransactions')} style={{ alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
                    <Text style={{ color: COLORS.text.white, fontWeight: 'bold', textDecorationLine: 'underline', fontSize: 14 }}>
                      All Transactions
                    </Text>
                  </TouchableOpacity>
                )}
                {/* View Menu Button Row */}
                <View style={{ marginBottom: 18 }}>
                  <Button
                    title="View Menu"
                    color={COLORS.primary}
                    onPress={() => navigation.navigate('LocationMenu', { locationId: item.id })}
                  />
                </View>
                {/* Deposit More Funds Button Row */}
                <View>
                  <Button
                    title="Deposit More Funds"
                    color={'#3ec6e0'}
                    onPress={() => navigation.navigate('Balance')}
                  />
                </View>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [businessData, setBusinessData] = useState({
    locations: [],
    amount_redeemed: 0,
    total_transactions: 0,
    average_rating: 0,
    amount_left_to_redeem: 0,
    total_revenue_deposits: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentDeposits, setRecentDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data for user:', user.id);
      
      // First check if user is an owner
      const { data: ownedLocation, error: ownerError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user.id)
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

        const amountLeftToRedeem = totalBalanceData?.reduce((sum, item) => sum + (item?.balance || 0), 0) || 0;

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
        const transactionUserIds = transactions?.map(t => t.customer_name).filter(Boolean) || [];
        const { data: transactionProfiles, error: transactionProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', transactionUserIds);

        if (transactionProfilesError) throw transactionProfilesError;

        // Map user names to transactions
        const transactionsWithNames = transactions?.map(transaction => ({
          ...transaction,
          user_name: transactionProfiles?.find(p => p.id === transaction.customer_name)?.full_name || 'Unknown Customer'
        })) || [];

        // Fetch total deposits for the location
        const { data: totalDepositsData, error: totalDepositsError } = await supabase
          .from('deposits')
          .select('amount')
          .eq('location_id', ownedLocation.id);

        if (totalDepositsError) throw totalDepositsError;

        const totalRevenueDeposits = totalDepositsData?.reduce((sum, item) => sum + (item?.amount || 0), 0) || 0;

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
        const depositUserIds = recentDeposits?.map(d => d.user_id).filter(Boolean) || [];
        const { data: depositProfiles, error: depositProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', depositUserIds);

        if (depositProfilesError) throw depositProfilesError;

        // Map user names to deposits
        const depositsWithNames = recentDeposits?.map(deposit => ({
          ...deposit,
          user_name: depositProfiles?.find(p => p.id === deposit.user_id)?.full_name || 'Unknown Customer'
        })) || [];

        setBusinessData({
          ...business,
          amount_redeemed: business?.business_metrics?.total_revenue || 0,
          total_transactions: business?.business_metrics?.total_transactions || 0,
          average_rating: business?.business_metrics?.average_rating || 0,
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
          .eq('id', user.id)
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
          locations: locations?.map(location => ({
            id: location.id,
            name: location.name,
            logo_url: location.logo_url,
            points: location.balances?.[0]?.balance || 0
          })) || []
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, fetchData]);

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
          onPress={() => fetchData()}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.primary }}>
        {/* Header with Profile and Inbox buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 8 }}>
            <FontAwesome name="user" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.text.white, flex: 1, textAlign: 'center' }}>Home</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')} style={{ padding: 8 }}>
            <FontAwesome name="envelope" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.container}>
          {/* Business Header */}
          <View style={styles.header}>
            {businessData?.logo_url ? (
              <Image 
                source={{ uri: businessData.logo_url }} 
                style={styles.logoLarge}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.logoPlaceholderLarge}>
                <FontAwesome name="building" size={48} color={COLORS.text.white} />
              </View>
            )}
            <Text style={styles.businessNameLarge}>{businessData?.name}</Text>
          </View>

          {/* Performance Metrics */}
          <View style={[styles.sectionBox, styles.statsRow]}>
            <View style={styles.statBox}>
              <Text style={styles.metricValue}>${(businessData?.total_revenue_deposits / 100 || 0).toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Total Deposited</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.metricValue}>${(businessData?.amount_left_to_redeem / 100 || 0).toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Left to Redeem</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.metricValue}>{businessData?.total_transactions || 0}</Text>
              <Text style={styles.metricLabel}>Redemptions</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="list" 
              title="View Menu" 
              onPress={() => navigation.navigate('LocationMenu')}
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
              icon="shopping-basket" 
              title="Active Orders" 
              onPress={() => navigation.navigate('ActiveOrders')}
            />
          </View>

          {/* Recent Deposits */}
          <View style={[styles.sectionBox, {marginTop: 12}]}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 8 }]}>Recent Deposits</Text>
            {recentDeposits.length === 0 ? (
              <Text style={styles.emptyText}>No recent deposits.</Text>
            ) : (
              recentDeposits.map((deposit) => (
                <View key={deposit.id} style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionCustomer}>{deposit.user_name}</Text>
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
          <View style={[styles.sectionBox, {marginTop: 12}]}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 8 }]}>Recent Redemptions</Text>
            {recentTransactions.length === 0 ? (
              <Text style={styles.emptyText}>No recent redemptions.</Text>
            ) : (
              recentTransactions.map((transaction) => (
                <View 
                  key={transaction.id}
                  style={styles.transactionItem}
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
                        transaction.status === 'redeemed'
                          ? { color: COLORS.secondary }
                          : transaction.status === 'completed' || transaction.status === 'complete'
                          ? { color: COLORS.primary }
                          : transaction.status === 'in_progress'
                          ? { color: COLORS.text.white }
                          : { color: COLORS.text.muted }
                      ]}>
                        {transaction.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render customer view
  if (!isOwner) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.primary }}>
        {/* Header with Profile and Inbox buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 8 }}>
            <FontAwesome name="user" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.text.white, flex: 1, textAlign: 'center' }}>Home</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')} style={{ padding: 8 }}>
            <FontAwesome name="envelope" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.container}>
          {businessData?.locations?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="map-marker" size={48} color={COLORS.text.muted} />
              <Text style={styles.emptyText}>No locations available</Text>
            </View>
          ) : (
            <CardStack
              data={businessData.locations}
              onCardPress={(location, action) => {
                if (action === 'balances') {
                  navigation.navigate('Balance');
                } else if (action === 'all-transactions') {
                  navigation.navigate('GlobalTransactions');
                } else {
                  navigation.navigate('LocationMenu', { locationId: location.id });
                }
              }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  sectionBox: {
    backgroundColor: COLORS.surface.card,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 12,
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
    // removed background and padding for new stat row style
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface.card, // or a custom light gray
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 30,
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 18,
  },
  quickAction: {
    flexBasis: '49%',
    height: 130,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
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
  logoLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  logoPlaceholderLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessNameLarge: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.text.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
}); 