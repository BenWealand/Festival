import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

export default function CustomerDetailsScreen({ route, navigation }) {
  const { customer } = route.params;

  // Radial gradients for background
  const radialGradients = useMemo(() => [
    { id: 'cust-detail-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'cust-detail-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'complete':
        return COLORS.primary;
      case 'in_progress':
        return COLORS.text.white;
      case 'redeemed':
        return COLORS.secondary;
      default:
        return COLORS.text.muted;
    }
  };

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <FontAwesome name="arrow-left" size={20} color={COLORS.text.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customer Details</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ padding: 16 }}>
              
              {/* Customer Info Card */}
              <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#fff' }]}>{formatAmount(customer.totalDeposited || customer.totalSpent || 0)}</Text>
                    <Text style={styles.statLabel}>Total Deposited</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#fff' }]}>{formatAmount(customer.totalRedeemed || 0)}</Text>
                    <Text style={styles.statLabel}>Total Redeemed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#fff' }]}>{customer.transactionCount}</Text>
                    <Text style={styles.statLabel}>Transactions</Text>
                  </View>
                </View>
              </GlassCard>

              {/* Transaction History Card */}
              <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                {customer.transactions && customer.transactions.length > 0 ? (
                  customer.transactions.map((transaction, index) => (
                    <View 
                      key={transaction.id || index} 
                      style={[
                        styles.transactionRow,
                        index < customer.transactions.length - 1 && styles.transactionRowBorder
                      ]}
                    >
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDate}>
                          {formatDate(transaction.created_at)}
                        </Text>
                        <Text style={[
                          styles.transactionStatus,
                          { color: getStatusColor(transaction.status) }
                        ]}>
                          {transaction.status.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.transactionAmount}>
                        {formatAmount(transaction.amount)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No transactions found.</Text>
                )}
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.white,
    opacity: 0.7,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.white,
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  emptyText: {
    color: COLORS.text.white,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
}); 