import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { startOfDay, startOfWeek, startOfMonth, subMonths, subYears } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalDeposits: 0,
    totalRedemptions: 0,
    cashbackDistributed: 0,
    netRevenue: 0,
    newUsers: 0,
    returningUsers: 0,
    returningUsersPercent: 0,
    topItems: [],
    logo_url: '',
    locationName: '',
    graphData: [],
    customerMetrics: {
      totalCustomers: 0,
      averageRedemptionValue: 0,
      repeatCustomers: 0,
    },
    timeMetrics: {
      busiestHour: '',
      busiestDay: '',
      averageRedemptionValue: 0,
    },
    chartData: {
      dayLabels: [],
      dailyDeposits: [],
      dailyRedemptions: [],
    },
  });
  const [tipsByEmployee, setTipsByEmployee] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
  const timeRanges = [
    { label: 'All Time', value: 'all' },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: '3 Month', value: '3month' },
    { label: '6 Month', value: '6month' },
    { label: 'Year', value: 'year' },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const getRangeStart = () => {
    if (timeRange === 'all') return null;
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return startOfDay(now);
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      case '3month':
        return subMonths(now, 3);
      case '6month':
        return subMonths(now, 6);
      case 'year':
        return subYears(now, 1);
      default:
        return null;
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get location for owner
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      if (locationError) throw locationError;
      setLocation(location);
      const locationId = location.id;
      // Time range filter
      const rangeStart = getRangeStart();
      // Fetch deposits in range
      let depositsQuery = supabase
        .from('deposits')
        .select('*')
        .eq('location_id', locationId);
      if (rangeStart) depositsQuery = depositsQuery.gte('created_at', rangeStart.toISOString());
      const { data: deposits, error: depositsError } = await depositsQuery;
      if (depositsError) throw depositsError;
      // Fetch all deposits for new/returning user logic
      const { data: allDeposits, error: allDepositsError } = await supabase
        .from('deposits')
        .select('user_id, created_at')
        .eq('location_id', locationId);
      if (allDepositsError) throw allDepositsError;
      // Fetch transactions in range
      let transactionsQuery = supabase
        .from('transactions')
        .select('*')
        .eq('location_id', locationId);
      if (rangeStart) transactionsQuery = transactionsQuery.gte('created_at', rangeStart.toISOString());
      const { data: transactions, error: transactionsError } = await transactionsQuery;
      if (transactionsError) throw transactionsError;
      // Fetch all transactions for graph
      const { data: allTransactions, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('location_id', locationId);
      if (allTransactionsError) throw allTransactionsError;
      // Fetch transaction_items for top items
      const { data: transactionItems, error: transactionItemsError } = await supabase
        .from('transaction_items')
        .select('menu_item_id, quantity, price_at_time, created_at, transaction_id')
        .in('transaction_id', transactions.map(t => t.id));
      if (transactionItemsError) throw transactionItemsError;
      // Fetch menu_items for names
      const { data: menuItems, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('id, name, price');
      if (menuItemsError) throw menuItemsError;
      // --- Calculate stats ---
      // Total Deposits
      const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
      // Amount Redeemed (sum of redemption amounts)
      const amountRedeemed = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      // Total Redemptions (count)
      const totalRedemptions = transactions.length;
      // Left to Redeem (deposits - amount redeemed)
      const leftToRedeem = totalDeposits - amountRedeemed;
      // New/Returning Users
      const userFirstDeposit = {};
      allDeposits.forEach(d => {
        if (!userFirstDeposit[d.user_id] || new Date(d.created_at) < new Date(userFirstDeposit[d.user_id])) {
          userFirstDeposit[d.user_id] = d.created_at;
        }
      });
      const usersInRange = new Set(deposits.map(d => d.user_id));
      let newUsers = 0;
      let returningUsers = 0;
      usersInRange.forEach(userId => {
        const firstDeposit = userFirstDeposit[userId];
        if (firstDeposit && new Date(firstDeposit) >= rangeStart) {
          newUsers++;
        } else {
          returningUsers++;
        }
      });
      const returningUsersPercent = usersInRange.size > 0 ? Math.round((returningUsers / usersInRange.size) * 100) : 0;
      // Customer Metrics
      // totalCustomers: unique depositors (all time)
      const allDepositorIds = allDeposits.map(d => d.user_id);
      const uniqueDepositors = Array.from(new Set(allDepositorIds));
      // repeatCustomers: users with >1 deposit (all time)
      const depositCounts = {};
      allDepositorIds.forEach(id => { depositCounts[id] = (depositCounts[id] || 0) + 1; });
      const repeatCustomers = Object.values(depositCounts).filter(count => count > 1).length;
      // averageRedemptionValue: average transaction amount in range
      const averageRedemptionValue = transactions.length > 0 ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / transactions.length / 100 : 0;
      // Top Items
      const itemMap = {};
      transactionItems.forEach(ti => {
        if (!itemMap[ti.menu_item_id]) {
          itemMap[ti.menu_item_id] = { uses: 0, redempd: 0, revenue: 0, price: 0 };
        }
        itemMap[ti.menu_item_id].uses += ti.quantity;
        itemMap[ti.menu_item_id].redempd++;
        itemMap[ti.menu_item_id].revenue += ti.price_at_time * ti.quantity;
        itemMap[ti.menu_item_id].price = ti.price_at_time / 100;
      });
      const topItems = Object.entries(itemMap).map(([id, data]) => {
        const menuItem = menuItems.find(m => m.id === id);
        return {
          name: menuItem ? menuItem.name : 'Unknown',
          order_count: data.redempd,
          uses: data.uses,
          price: data.price,
          revenue: data.revenue / 100,
        };
      }).sort((a, b) => b.order_count - a.order_count).slice(0, 5);
      // Graph Data (daily revenue breakdown)
      // (Placeholder: just return all transactions in range for now)
      const graphData = allTransactions.filter(t => new Date(t.created_at) >= rangeStart);
      // Time Metrics
      // busiestHour, busiestDay, averageRedemptionValue (for selected range)
      const hourlyCounts = Array(24).fill(0);
      const dailyCounts = Array(7).fill(0);
      let totalAmount = 0;
      transactions.forEach(t => {
        const date = new Date(t.created_at);
        hourlyCounts[date.getHours()]++;
        dailyCounts[date.getDay()]++;
        totalAmount += t.amount || 0;
      });
      const busiestHourIdx = hourlyCounts.indexOf(Math.max(...hourlyCounts));
      const busiestDayIdx = dailyCounts.indexOf(Math.max(...dailyCounts));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const busiestHour = busiestHourIdx >= 0 ? `${busiestHourIdx}:00` : 'N/A';
      const busiestDay = busiestDayIdx >= 0 ? dayNames[busiestDayIdx] : 'N/A';
      const avgRedemptionValue = transactions.length > 0 ? totalAmount / transactions.length / 100 : 0;
      // Prepare daily data for charts
      // Determine date range
      let chartStart = rangeStart;
      let chartEnd = new Date();
      if (!chartStart) {
        // If all time, use earliest deposit or transaction
        const allDates = [...deposits.map(d => new Date(d.created_at)), ...transactions.map(t => new Date(t.created_at))];
        if (allDates.length > 0) {
          chartStart = new Date(Math.min(...allDates.map(d => d.getTime())));
        } else {
          chartStart = new Date();
        }
      }
      // Build list of days
      const days = [];
      let d = new Date(chartStart);
      d.setHours(0,0,0,0);
      while (d <= chartEnd) {
        days.push(new Date(d));
        d = new Date(d);
        d.setDate(d.getDate() + 1);
      }
      // Daily totals for deposits
      const dailyDeposits = days.map(day => {
        const dayStr = day.toISOString().slice(0,10);
        return deposits.filter(dep => dep.created_at.slice(0,10) === dayStr).reduce((sum, dep) => sum + (dep.amount || 0), 0) / 100;
      });
      // Daily totals for redemptions
      const dailyRedemptions = days.map(day => {
        const dayStr = day.toISOString().slice(0,10);
        return transactions.filter(tx => tx.created_at.slice(0,10) === dayStr).reduce((sum, tx) => sum + (tx.amount || 0), 0) / 100;
      });
      // Always show exactly 4 labels: first, 1/3, 2/3, last
      let dayLabels = Array(days.length).fill('');
      if (days.length > 0) {
        const idx1 = 0;
        const idx2 = Math.floor(days.length / 3);
        const idx3 = Math.floor(days.length * 2 / 3);
        const idx4 = days.length - 1;
        dayLabels[idx1] = `${days[idx1].getMonth()+1}/${days[idx1].getDate()}`;
        if (idx2 !== idx1 && idx2 !== idx4) dayLabels[idx2] = `${days[idx2].getMonth()+1}/${days[idx2].getDate()}`;
        if (idx3 !== idx1 && idx3 !== idx2 && idx3 !== idx4) dayLabels[idx3] = `${days[idx3].getMonth()+1}/${days[idx3].getDate()}`;
        if (idx4 !== idx1) dayLabels[idx4] = `${days[idx4].getMonth()+1}/${days[idx4].getDate()}`;
      }
      setAnalytics({
        totalDeposits,
        totalRedemptions,
        amountRedeemed,
        leftToRedeem,
        newUsers,
        returningUsers,
        returningUsersPercent,
        topItems,
        logo_url: location.logo_url,
        locationName: location.name,
        graphData,
        customerMetrics: {
          totalCustomers: uniqueDepositors.length,
          averageRedemptionValue,
          repeatCustomers,
        },
        timeMetrics: {
          busiestHour,
          busiestDay,
          averageRedemptionValue: avgRedemptionValue,
        },
        chartData: {
          dayLabels,
          dailyDeposits,
          dailyRedemptions,
        },
      });
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
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
      {/* Header: Logo and Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8, paddingHorizontal: 20 }}>
        {analytics.logo_url ? (
          <Image
            source={{ uri: analytics.logo_url }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 24 }}>?</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 18 }}>{analytics.locationName || 'Business Name'}</Text>
        </View>
        <TouchableOpacity
          style={{ marginLeft: 8, minWidth: 120, backgroundColor: COLORS.surface.card, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowTimeRangeModal(true)}
        >
          <Text style={{ color: COLORS.text.white, fontWeight: '600' }}>{timeRanges.find(r => r.value === timeRange)?.label || 'Select Range'}</Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selection Modal */}
      <Modal visible={showTimeRangeModal} transparent animationType="slide" onRequestClose={() => setShowTimeRangeModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: COLORS.surface.card, borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: COLORS.text.white, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Select Time Range</Text>
            {timeRanges.map(range => (
              <TouchableOpacity
                key={range.value}
                style={{ padding: 12, backgroundColor: timeRange === range.value ? COLORS.primary : COLORS.surface.secondary, borderRadius: 8, marginBottom: 8 }}
                onPress={() => {
                  setTimeRange(range.value);
                  setShowTimeRangeModal(false);
                }}
              >
                <Text style={{ color: COLORS.text.white }}>{range.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: COLORS.surface.secondary, padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowTimeRangeModal(false)}
              >
                <Text style={{ color: COLORS.text.white }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Overview Section */}
      <View style={[styles.section, { marginHorizontal: 16, marginTop: 8, marginBottom: 16, backgroundColor: COLORS.surface.card }]}> 
        {/* Overview Title: More natural language for each time range */}
        <Text style={{ color: COLORS.text.muted, fontWeight: '600', fontSize: 16, marginBottom: 8 }}>
          {(() => {
            switch (timeRange) {
              case 'all': return 'Overview (All Time)';
              case 'day': return 'Overview (Today)';
              case 'week': return 'Overview (This Week)';
              case 'month': return 'Overview (This Month)';
              case '3month': return 'Overview (Last 3 Months)';
              case '6month': return 'Overview (Last 6 Months)';
              case 'year': return 'Overview (This Year)';
              default: return 'Overview';
            }
          })()}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Total Deposits</Text>
            <Text style={styles.metricValue}>${(analytics.totalDeposits / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Total Redemptions</Text>
            <Text style={styles.metricValue}>{analytics.totalRedemptions}</Text>
          </View>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Amount Redeemed</Text>
            <Text style={styles.metricValue}>${(analytics.amountRedeemed / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Left to Redeem</Text>
            <Text style={styles.metricValue}>${(analytics.leftToRedeem / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>New Users</Text>
            <Text style={styles.metricValue}>+{analytics.newUsers}</Text>
          </View>
          <View style={{ width: '48%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>% Returning Users</Text>
            <Text style={styles.metricValue}>{analytics.returningUsersPercent}%</Text>
          </View>
        </View>
      </View>

      {/* Daily Revenue Breakdown (Line Charts) */}
      <View style={[styles.section, { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface.card }]}> 
        <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Daily Revenue Breakdown</Text>
        {/* Redemptions Chart */}
        <Text style={{ color: COLORS.text.muted, fontWeight: '600', marginBottom: 2 }}>Redemptions</Text>
        {analytics.chartData && analytics.chartData.dailyRedemptions.length > 0 ? (
          <View>
            <LineChart
              data={{
                labels: analytics.chartData.dayLabels,
                datasets: [
                  { data: analytics.chartData.dailyRedemptions, color: () => COLORS.primary, strokeWidth: 2 },
                ],
              }}
              width={Dimensions.get('window').width - 56}
              height={120}
              chartConfig={{
                backgroundColor: COLORS.surface.card,
                backgroundGradientFrom: COLORS.surface.card,
                backgroundGradientTo: COLORS.surface.card,
                decimalPlaces: 2,
                color: (opacity = 1) => COLORS.primary,
                labelColor: (opacity = 1) => COLORS.text.muted,
                propsForDots: { r: '2', strokeWidth: '1', stroke: COLORS.primary },
                propsForBackgroundLines: { stroke: COLORS.surface.secondary },
              }}
              bezier
              style={{ marginBottom: 0, borderRadius: 8 }}
            />
            <Text style={{ color: COLORS.text.muted, fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: 12 }}>Date</Text>
          </View>
        ) : (
          <Text style={{ color: COLORS.text.muted, fontSize: 14, marginBottom: 12 }}>[No data]</Text>
        )}
        {/* Deposits Chart */}
        <Text style={{ color: COLORS.text.muted, fontWeight: '600', marginBottom: 2 }}>Deposits</Text>
        {analytics.chartData && analytics.chartData.dailyDeposits.length > 0 ? (
          <View>
            <LineChart
              data={{
                labels: analytics.chartData.dayLabels,
                datasets: [
                  { data: analytics.chartData.dailyDeposits, color: () => COLORS.secondary, strokeWidth: 2 },
                ],
              }}
              width={Dimensions.get('window').width - 56}
              height={120}
              chartConfig={{
                backgroundColor: COLORS.surface.card,
                backgroundGradientFrom: COLORS.surface.card,
                backgroundGradientTo: COLORS.surface.card,
                decimalPlaces: 2,
                color: (opacity = 1) => COLORS.secondary,
                labelColor: (opacity = 1) => COLORS.text.muted,
                propsForDots: { r: '2', strokeWidth: '1', stroke: COLORS.secondary },
                propsForBackgroundLines: { stroke: COLORS.surface.secondary },
              }}
              bezier
              style={{ marginBottom: 0, borderRadius: 8 }}
            />
            <Text style={{ color: COLORS.text.muted, fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: 4 }}>Date</Text>
          </View>
        ) : (
          <Text style={{ color: COLORS.text.muted, fontSize: 14 }}>[No data]</Text>
        )}
      </View>

      {/* Top Performing Items (Redemptions) */}
      <View style={[styles.section, { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface.card }]}> 
        <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Top Performing Items (Redemptions)</Text>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 6 }}>
          <Text style={[styles.metricLabel, { flex: 2 }]}>Item</Text>
          <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Redempd</Text>
          <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Uses</Text>
          <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Avg Deposit</Text>
          <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
        </View>
        {analytics.topItems.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surface.secondary }}>
            <Text style={{ color: COLORS.text.white, flex: 2 }}>{item.name}</Text>
            <Text style={{ color: COLORS.text.muted, flex: 1, textAlign: 'right' }}>{item.redempd}</Text>
            <Text style={{ color: COLORS.text.muted, flex: 1, textAlign: 'right' }}>{item.uses}</Text>
            <Text style={{ color: COLORS.text.muted, flex: 1, textAlign: 'right' }}>${item.price.toFixed(2)}</Text>
            <Text style={{ color: COLORS.text.muted, flex: 1, textAlign: 'right' }}>${item.revenue.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Time Analytics */}
      <View style={[styles.section, { marginHorizontal: 16, marginBottom: 32, backgroundColor: COLORS.surface.card }]}> 
        <Text style={{ color: COLORS.text.muted, fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}>Time Analytics</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Busiest Hour</Text>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestHour}</Text>
          </View>
          <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Busiest Day</Text>
            <Text style={styles.metricValue}>{analytics.timeMetrics.busiestDay}</Text>
          </View>
          <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
            <Text style={styles.metricLabel}>Avg. Order Value</Text>
            <Text style={styles.metricValue}>${analytics.timeMetrics.averageRedemptionValue.toFixed(2)}</Text>
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