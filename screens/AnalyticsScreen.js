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
    dailyRevenue: [],
    topItems: [],
    customerMetrics: {
      totalCustomers: 0,
      averageSpend: 0,
      repeatCustomers: 0
    },
    timeMetrics: {
      busiestHour: '',
      busiestDay: '',
      averageOrderValue: 0
    }
  });

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
      const { data: revenueData, error: revenueError } = await supabase
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
        averageSpend: customerData.reduce((acc, curr) => acc + curr.total_spent, 0) / (customerData.length * 100),
        repeatCustomers: customerData.filter(c => c.total_orders > 1).length
      };

      // Calculate time metrics from transactions
      const { data: timeData, error: timeError } = await supabase
        .from('transactions')
        .select('created_at, amount')
        .eq('location_id', location.id);

      if (timeError) throw timeError;

      const timeMetrics = calculateTimeMetrics(timeData);

      setAnalytics({
        dailyRevenue: revenueData.map(day => ({
          date: new Date(day.date).toLocaleDateString(),
          amount: day.total_revenue / 100
        })),
        topItems: topItems.map(item => ({
          name: item.name,
          price: item.price / 100,
          order_count: item.total_orders
        })),
        customerMetrics,
        timeMetrics
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
      busiestDay,
      averageOrderValue: totalAmount / (data.length * 100)
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
      {/* Daily Revenue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Revenue</Text>
        {analytics.dailyRevenue.map((day, index) => (
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
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.customerMetrics.totalCustomers}</Text>
            <Text style={styles.metricLabel}>Total Customers</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${analytics.customerMetrics.averageSpend.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Avg. Spend</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.customerMetrics.repeatCustomers}</Text>
            <Text style={styles.metricLabel}>Repeat Customers</Text>
          </View>
        </View>
      </View>

      {/* Time Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Analysis</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestHour}</Text>
            <Text style={styles.metricLabel}>Busiest Hour</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestDay}</Text>
            <Text style={styles.metricLabel}>Busiest Day</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${analytics.timeMetrics.averageOrderValue.toFixed(2)}</Text>
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
}); 