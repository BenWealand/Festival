import React, { useState, useEffect, useMemo } from 'react';
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
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { startOfDay, startOfWeek, startOfMonth, subMonths, subYears } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlowingButton from '../components/GlowingButton';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  // Add contentHeight state and radialGradients like other screens
  const [contentHeight, setContentHeight] = useState(0);

  // Generate two random radial gradient positions
  const radialGradients = useMemo(() => [
    {
      id: 'bg-radial-1',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '60%',
      ry: '60%',
    },
    {
      id: 'bg-radial-2',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '70%',
      ry: '70%',
    },
  ], []);

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
      
      // Ensure arrays are not undefined
      const safeDeposits = deposits || [];
      const safeAllDeposits = allDeposits || [];
      const safeTransactions = transactions || [];
      const safeAllTransactions = allTransactions || [];
      
      // Fetch transaction_items for top items (only if we have transactions)
      let transactionItems = [];
      let menuItems = [];
      if (safeTransactions.length > 0) {
        const { data: transactionItemsData, error: transactionItemsError } = await supabase
          .from('transaction_items')
          .select('menu_item_id, quantity, price_at_time, created_at, transaction_id')
          .in('transaction_id', safeTransactions.map(t => t.id));
        if (transactionItemsError) throw transactionItemsError;
        transactionItems = transactionItemsData || [];
        
        // Fetch menu_items for names
        const { data: menuItemsData, error: menuItemsError } = await supabase
          .from('menu_items')
          .select('id, name, price');
        if (menuItemsError) throw menuItemsError;
        menuItems = menuItemsData || [];
      }
      
      // --- Calculate stats ---
      // Total Deposits
      const totalDeposits = safeDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
      // Amount Redeemed (sum of redemption amounts)
      const amountRedeemed = safeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      // Total Redemptions (count)
      const totalRedemptions = safeTransactions.length;
      // Left to Redeem (deposits - amount redeemed)
      const leftToRedeem = totalDeposits - amountRedeemed;
      // New/Returning Users
      const userFirstDeposit = {};
      safeAllDeposits.forEach(d => {
        if (!userFirstDeposit[d.user_id] || new Date(d.created_at) < new Date(userFirstDeposit[d.user_id])) {
          userFirstDeposit[d.user_id] = d.created_at;
        }
      });
      const usersInRange = new Set(safeDeposits.map(d => d.user_id));
      let newUsers = 0;
      let returningUsers = 0;
      usersInRange.forEach(userId => {
        const firstDeposit = userFirstDeposit[userId];
        if (firstDeposit && rangeStart && new Date(firstDeposit) >= rangeStart) {
          newUsers++;
        } else {
          returningUsers++;
        }
      });
      const returningUsersPercent = usersInRange.size > 0 ? Math.round((returningUsers / usersInRange.size) * 100) : 0;
      // Customer Metrics
      // totalCustomers: unique depositors (all time)
      const allDepositorIds = safeAllDeposits.map(d => d.user_id);
      const uniqueDepositors = Array.from(new Set(allDepositorIds));
      // repeatCustomers: users with >1 deposit (all time)
      const depositCounts = {};
      allDepositorIds.forEach(id => { depositCounts[id] = (depositCounts[id] || 0) + 1; });
      const repeatCustomers = Object.values(depositCounts).filter(count => count > 1).length;
      // averageRedemptionValue: average transaction amount in range
      const averageRedemptionValue = safeTransactions.length > 0 ? safeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / safeTransactions.length / 100 : 0;
      // Top Items
      const itemMap = {};
      transactionItems.forEach(ti => {
        if (!itemMap[ti.menu_item_id]) {
          itemMap[ti.menu_item_id] = { uses: 0, redempd: 0, revenue: 0, price: 0 };
        }
        itemMap[ti.menu_item_id].uses += ti.quantity || 0;
        itemMap[ti.menu_item_id].redempd++;
        itemMap[ti.menu_item_id].revenue += (ti.price_at_time || 0) * (ti.quantity || 0);
        itemMap[ti.menu_item_id].price = (ti.price_at_time || 0) / 100;
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
      const graphData = safeAllTransactions.filter(t => !rangeStart || new Date(t.created_at) >= rangeStart);
      // Time Metrics
      // busiestHour, busiestDay, averageRedemptionValue (for selected range)
      const hourlyCounts = Array(24).fill(0);
      const dailyCounts = Array(7).fill(0);
      let totalAmount = 0;
      safeTransactions.forEach(t => {
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
      const avgRedemptionValue = safeTransactions.length > 0 ? totalAmount / safeTransactions.length / 100 : 0;
      // Prepare daily data for charts
      // Determine date range
      let chartStart = rangeStart;
      let chartEnd = new Date();
      if (!chartStart) {
        // If all time, use earliest deposit or transaction
        const allDates = [...safeDeposits.map(d => new Date(d.created_at)), ...safeTransactions.map(t => new Date(t.created_at))];
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
        return safeDeposits.filter(dep => dep.created_at && dep.created_at.slice(0,10) === dayStr).reduce((sum, dep) => sum + (dep.amount || 0), 0) / 100;
      });
      // Daily totals for redemptions
      const dailyRedemptions = days.map(day => {
        const dayStr = day.toISOString().slice(0,10);
        return safeTransactions.filter(tx => tx.created_at && tx.created_at.slice(0,10) === dayStr).reduce((sum, tx) => sum + (tx.amount || 0), 0) / 100;
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
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
    <BackgroundGradient>
      <MeteorBackground />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <ScrollView style={{ flex: 1 }} onContentSizeChange={(w, h) => setContentHeight(h)}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}>
            {/* Header: Logo and Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 18, flex: 1 }}>Analytics</Text>
              <TouchableOpacity
                style={{ marginLeft: 8, minWidth: 120, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowTimeRangeModal(true)}
              >
                <Text style={{ color: COLORS.text.white, fontWeight: '600' }}>{timeRanges.find(r => r.value === timeRange)?.label || 'Select Range'}</Text>
              </TouchableOpacity>
            </View>

            {/* Overview Section */}
            <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
              <Text style={styles.sectionTitle}>
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
            </GlassCard>

            {/* Daily Revenue Breakdown (Line Charts) */}
            <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
              <Text style={styles.sectionTitle}>Daily Revenue Breakdown</Text>
              {[
                { label: 'Redemptions', color: '#FFFFFF', data: analytics.chartData?.dailyRedemptions || [] },
                { label: 'Deposits', color: '#FFFFFF', data: analytics.chartData?.dailyDeposits || [] }
              ].map((chart, idx) => {
                const cx = `${randomInt(30, 70)}%`;
                const cy = `${randomInt(30, 70)}%`;
                const chartData = {
                  labels: analytics.chartData?.dayLabels || [],
                  datasets: [{
                    data: chart.data || [],
                    color: () => chart.color,
                    strokeWidth: 2
                  }]
                };
                return (
                  <View key={chart.label} style={styles.purpleGraphCard}>
                    <Text style={styles.chartLabel}>{chart.label}</Text>
                    {chartData.datasets[0].data && chartData.datasets[0].data.length > 0 ? (
                      <LineChart
                        data={chartData}
                        width={Dimensions.get('window').width - 96}
                        height={200}
                        chartConfig={{
                          backgroundColor: 'transparent',
                          backgroundGradientFrom: 'transparent',
                          backgroundGradientTo: 'transparent',
                          backgroundGradientFromOpacity: 0,
                          backgroundGradientToOpacity: 0,
                          decimalPlaces: 0,
                          color: (opacity = 1) => chart.color,
                          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                          style: {
                            borderRadius: 16,
                          },
                          propsForDots: {
                            r: "6",
                            strokeWidth: "2",
                            stroke: chart.color,
                          },
                          propsForLabels: {
                            color: '#FFFFFF',
                          },
                          propsForBackgroundLines: {
                            strokeDasharray: '',
                            stroke: 'rgba(255, 255, 255, 0.3)',
                            strokeWidth: 1,
                          },
                        }}
                        bezier
                        style={{
                          marginVertical: 8,
                          borderRadius: 16,
                          marginLeft: -32,
                        }}
                      />
                    ) : (
                      <Text style={styles.noDataText}>[No data]</Text>
                    )}
                  </View>
                );
              })}
            </GlassCard>

            {/* Top Performing Items (Redemptions) */}
            <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
              <Text style={styles.sectionTitle}>Top Performing Items (Redemptions)</Text>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 6 }}>
                <Text style={[styles.metricLabel, { flex: 2 }]}>Item</Text>
                <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Redempd</Text>
                <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Uses</Text>
                <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Avg Deposit</Text>
                <Text style={[styles.metricLabel, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
              </View>
              {(analytics.topItems || []).map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surface.secondary }}>
                  <Text style={{ color: COLORS.text.white, flex: 2 }}>{item.name}</Text>
                  <Text style={{ color: COLORS.text.white, flex: 1, textAlign: 'right' }}>{item.redempd}</Text>
                  <Text style={{ color: COLORS.text.white, flex: 1, textAlign: 'right' }}>{item.uses}</Text>
                  <Text style={{ color: COLORS.text.white, flex: 1, textAlign: 'right' }}>${(item.price || 0).toFixed(2)}</Text>
                  <Text style={{ color: COLORS.text.white, flex: 1, textAlign: 'right' }}>${(item.revenue || 0).toFixed(2)}</Text>
                </View>
              ))}
            </GlassCard>

            {/* Time Analytics */}
            <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
              <Text style={styles.sectionTitle}>Time Analytics</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
                  <Text style={styles.metricLabel}>Busiest Hour</Text>
                  <Text style={styles.metricValue}>{analytics.timeMetrics?.busiestHour || 'N/A'}</Text>
                </View>
                <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
                  <Text style={styles.metricLabel}>Busiest Day</Text>
                  <Text style={styles.metricValue}>{analytics.timeMetrics?.busiestDay || 'N/A'}</Text>
                </View>
                <View style={{ width: '32%', marginBottom: 8, alignItems: 'center' }}>
                  <Text style={styles.metricLabel}>Avg. Order Value</Text>
                  <Text style={styles.metricValue}>${(analytics.timeMetrics?.averageRedemptionValue || 0).toFixed(2)}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Time Range Modal - Keep existing */}
      {showTimeRangeModal && (
        <Modal
          visible={showTimeRangeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimeRangeModal(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View style={{ width: '90%', maxWidth: 400, borderRadius: 16, padding: 24, backgroundColor: BACKGROUND_BASE }}>
              <Text style={{ color: COLORS.text.white, fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Select Time Range</Text>
              {timeRanges.map((range) => (
                <TouchableOpacity
                  key={range.value}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: timeRange === range.value ? COLORS.primary : 'transparent',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setTimeRange(range.value);
                    setShowTimeRangeModal(false);
                  }}
                >
                  <Text style={{
                    color: COLORS.text.white,
                    fontWeight: timeRange === range.value ? 'bold' : '600',
                    fontSize: 16,
                  }}>{range.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 8, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: 'red' }}
                onPress={() => setShowTimeRangeModal(false)}
              >
                <Text style={{ color: COLORS.text.white, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_BASE,
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
    color: COLORS.text.white,
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
    color: COLORS.text.white,
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
    color: COLORS.text.white,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.white,
    textAlign: 'center',
  },
  noteText: {
    color: COLORS.text.white,
    fontSize: 14,
    marginTop: 8,
  },
  purpleGraphCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    minHeight: 200,
    justifyContent: 'center',
    backgroundColor: BACKGROUND_BASE,
    position: 'relative',
  },
  chartLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 8,
  },
  chartContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  chartAxisLabel: {
    fontSize: 13,
    color: COLORS.text.white,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.text.white,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  timeRangeOption: {
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedTimeRange: {
    backgroundColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  selectedTimeRangeText: {
    color: COLORS.text.white,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surface.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
    fontSize: 16,
  },
}); 