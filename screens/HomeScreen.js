import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [businessData, setBusinessData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First check if user is an owner
        const { data: ownedLocation, error: ownerError } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user?.id)
          .single();

        if (ownerError && ownerError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw ownerError;
        }

        setIsOwner(!!ownedLocation);

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

          setBusinessData({
            ...business,
            total_revenue: business.business_metrics?.total_revenue || 0,
            total_transactions: business.business_metrics?.total_transactions || 0,
            average_rating: business.business_metrics?.average_rating || 0
          });
          setRecentTransactions(transactions);
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
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
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
            <Text style={styles.metricValue}>${businessData?.total_revenue || 0}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{businessData?.total_transactions || 0}</Text>
            <Text style={styles.metricLabel}>Transactions</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{businessData?.average_rating || 0}</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
          </View>
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

        {/* Recent Transactions */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentTransactions.map((transaction) => (
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
                <Text style={styles.transactionCustomer}>{transaction.customer_name}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amountText}>${transaction.amount}</Text>
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
          ))}
        </View>
      </ScrollView>
    );
  }

  // Render customer view
  return (
    <ScrollView style={styles.container}>
      <View style={styles.locationsContainer}>
        {businessData?.locations?.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="map-marker" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No locations available</Text>
          </View>
        ) : (
          businessData?.locations?.map((location) => (
            <TouchableOpacity 
              key={location.id} 
              style={styles.locationBox}
              onPress={() => navigation.navigate('LocationMenu', { locationId: location.id })}
            >
              <View style={styles.logoContainer}>
                {location.logo_url ? (
                  <Image 
                    source={{ uri: location.logo_url }} 
                    style={styles.logo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.logoCircle}>
                    <FontAwesome name="building" size={24} color={COLORS.text.white} />
                  </View>
                )}
              </View>
              
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>{location.name}</Text>
              </View>
              
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsNumber}>{location.points}</Text>
                <Text style={styles.pointsLabel}>points</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
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
  pointsLabel: {
    fontSize: 14,
    color: COLORS.text.white,
    marginTop: 4,
  },
}); 