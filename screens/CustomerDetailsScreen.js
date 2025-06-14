import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { COLORS } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function CustomerDetailsScreen({ route, navigation }) {
  const { customer } = route.params;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{customer.name}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(customer.totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{customer.transactionCount}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(customer.totalSpent / customer.transactionCount)}</Text>
            <Text style={styles.statLabel}>Avg. Spend</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {customer.transactions.map((transaction, index) => (
          <View key={index} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
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
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.surface.card,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: COLORS.surface.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  transactionStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
}); 