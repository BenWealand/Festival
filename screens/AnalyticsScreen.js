import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    dailyRedemptions: [],
    topItems: [],
    customerMetrics: {
      totalCustomers: 0,
      averageRedemptionValue: 0,
      repeatCustomers: 0
    },
    timeMetrics: {
      busiestHour: '',
      busiestDay: '',
      averageRedemptionValue: 0
    },
    amountLeftToRedeem: 0,
    totalRevenueDeposits: 0
  });
  const [tipsByEmployee, setTipsByEmployee] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get location ID for the owner
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (locationError) throw locationError;

      // Fetch last 7 days of revenue
      const { data: dailyRedemptionsData, error: revenueError } = await supabase
        .from('daily_revenue')
        .select('*')
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: true });

      if (revenueError) throw revenueError;

      // Fetch top selling items
      const { data: topItems, error: itemsError } = await supabase
        .from('menu_item_analytics')
        .select('*')
        .order('total_orders', { ascending: false })
        .limit(5);

      if (itemsError) throw itemsError;

      // Fetch customer metrics
      const { data: customerData, error: customerError } = await supabase
        .from('customer_analytics')
        .select('*');

      if (customerError) throw customerError;

      // Calculate customer metrics
      const customerMetrics = {
        totalCustomers: customerData.length,
        averageRedemptionValue: customerData.reduce((acc, curr) => acc + curr.total_spent, 0) / (customerData.length || 1) / 100,
        repeatCustomers: customerData.filter(c => c.total_orders > 1).length
      };

      // Fetch total balance for the location
      const { data: totalBalanceData, error: totalBalanceError } = await supabase
        .from('balances')
        .select('balance')
        .eq('location_id', location.id);
      
      if (totalBalanceError) throw totalBalanceError;
      const amountLeftToRedeem = totalBalanceData.reduce((sum, item) => sum + item.balance, 0);
      
      // Calculate time metrics from transactions
      const { data: timeData, error: timeError } = await supabase
        .from('transactions')
        .select('created_at, amount')
        .eq('location_id', location.id);

      if (timeError) throw timeError;

      const timeMetrics = calculateTimeMetrics(timeData);

      // Fetch total deposits for the location
      const { data: totalDepositsData, error: totalDepositsError } = await supabase
        .from('deposits')
        .select('amount')
        .eq('location_id', location.id);

      if (totalDepositsError) throw totalDepositsError;

      const totalRevenueDeposits = totalDepositsData.reduce((sum, item) => sum + item.amount, 0);

      // Fetch tips by employee (join through transactions for location)
      const { data: tipsData, error: tipsError } = await supabase
        .from('tips')
        .select('amount, employee_id, employees(name), transactions(location_id)')
        .eq('transactions.location_id', location.id);
      if (tipsError) throw tipsError;
      // Group and sum tips by employee
      const tipsMap = {};
      for (const tip of tipsData) {
        const empId = tip.employee_id;
        const empName = tip.employees?.name || 'Unknown';
        if (!tipsMap[empId]) tipsMap[empId] = { name: empName, total: 0 };
        tipsMap[empId].total += tip.amount;
      }
      setTipsByEmployee(Object.values(tipsMap));

      setAnalytics({
        dailyRedemptions: dailyRedemptionsData.map(day => ({
          date: new Date(day.date).toLocaleDateString(),
          amount: day.total_revenue / 100 // This is actually total redeemed for the day
        })),
        topItems: topItems.map(item => ({
          name: item.name,
          price: item.price / 100,
          order_count: item.total_orders
        })),
        customerMetrics,
        timeMetrics,
        amountLeftToRedeem,
        totalRevenueDeposits: totalRevenueDeposits,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeMetrics = (data) => {
    const hourlyOrders = new Array(24).fill(0);
    const dailyOrders = new Array(7).fill(0);
    let totalAmount = 0;

    data.forEach(transaction => {
      const date = new Date(transaction.created_at);
      hourlyOrders[date.getHours()]++;
      dailyOrders[date.getDay()]++;
      totalAmount += transaction.amount;
    });

    const busiestHour = hourlyOrders.indexOf(Math.max(...hourlyOrders));
    const busiestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      dailyOrders.indexOf(Math.max(...dailyOrders))
    ];

    return {
      busiestHour: `${busiestHour}:00`,
      busiestDay: busiestDay || 'N/A',
      averageRedemptionValue: totalAmount / (data.length * 100)
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
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
      {/* Amount Left to Redeem */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Balances</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${(analytics.amountLeftToRedeem / 100).toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Amount Left to Redeem</Text>
          </View>
        </View>
      </View>

      {/* Total Revenue (Deposits) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Total Revenue (Deposits)</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${(analytics.totalRevenueDeposits / 100).toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
        </View>
      </View>

      {/* Tips by Employee */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tips by Employee</Text>
        {tipsByEmployee.length === 0 ? (
          <Text style={styles.noteText}>No tips recorded yet.</Text>
        ) : (
          tipsByEmployee.map((emp, idx) => (
            <View key={idx} style={styles.revenueRow}>
              <Text style={styles.itemName}>{emp.name}</Text>
              <Text style={styles.amountText}>${(emp.total / 100).toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Daily Redemptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Redemptions (Amount Spent)</Text>
        {analytics.dailyRedemptions.map((day, index) => (
          <View key={index} style={styles.revenueRow}>
            <Text style={styles.dateText}>{day.date}</Text>
            <Text style={styles.amountText}>${day.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Top Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Items</Text>
        {analytics.topItems.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCount}>{item.order_count} orders</Text>
          </View>
        ))}
      </View>

      {/* Customer Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Insights</Text>
        <View style={[styles.metricsGrid, { justifyContent: 'flex-start' }]}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.customerMetrics.totalCustomers || 0}</Text>
            <Text style={styles.metricLabel}>Total Customers</Text>
          </View>
          <View style={[styles.metricCard, { marginRight: 0 }]}>
            <Text style={styles.metricValue}>${analytics.customerMetrics.averageRedemptionValue.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Avg. Spend</Text>
          </View>
          <View style={[styles.metricCard, { marginRight: 0 }]}>
            <Text style={styles.metricValue}>{analytics.customerMetrics.repeatCustomers}</Text>
            <Text style={styles.metricLabel}>Repeat Customers</Text>
          </View>
        </View>
      </View>

      {/* Time Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Analysis (Redemptions)</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestHour || 'N/A'}</Text>
            <Text style={styles.metricLabel}>Busiest Hour</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestDay || 'N/A'}</Text>
            <Text style={styles.metricLabel}>Busiest Day</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${analytics.timeMetrics.averageRedemptionValue.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Avg. Order Value</Text>
          </View>
        </View>
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
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.surface.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text.white,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemName: {
    fontSize: 16,
    color: COLORS.text.white,
  },
  itemCount: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metricCard: {
    width: '30%',
    backgroundColor: COLORS.surface.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
  },
  noteText: {
    color: COLORS.text.muted,
    fontSize: 14,
    marginTop: 8,
  },
}); 