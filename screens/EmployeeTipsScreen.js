import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

const timeRanges = [
  { label: 'All Time', value: 'all' },
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Month', value: '3month' },
  { label: '6 Month', value: '6month' },
  { label: 'Year', value: 'year' },
];

function getRangeStart(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case 'all': return null;
    case 'day': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + 1); // Monday
      d.setHours(0,0,0,0);
      return d;
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3month': return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case '6month': return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
}

export default function EmployeeTipsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tips, setTips] = useState([]);
  const [timeRange, setTimeRange] = useState('all');
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('amount'); // 'amount' | 'name'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Generate two random radial gradient positions
  const radialGradients = useMemo(() => [
    {
      id: 'tips-bg-1',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '60%',
      ry: '60%',
    },
    {
      id: 'tips-bg-2',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '70%',
      ry: '70%',
    },
  ], []);

  useEffect(() => {
    fetchTips();
  }, [timeRange]);

  const fetchTips = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get location for owner
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      if (locationError) throw locationError;
      const locationId = location.id;
      
      // Fetch employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('location_id', locationId);
      if (empError) throw empError;
      
      // Fetch tips for employees in time range
      let tipsQuery = supabase
        .from('tips')
        .select('employee_id, amount, created_at')
        .in('employee_id', employees.map(e => e.id));
      const rangeStart = getRangeStart(timeRange);
      if (rangeStart) tipsQuery = tipsQuery.gte('created_at', rangeStart.toISOString());
      const { data: tipsData, error: tipsError } = await tipsQuery;
      if (tipsError) throw tipsError;
      
      // Fetch paid tips (assuming there's a tip_payments table or similar)
      // For now, we'll use a placeholder - you may need to create this table
      let paidTipsQuery = supabase
        .from('tip_payments')
        .select('employee_id, amount, created_at')
        .in('employee_id', employees.map(e => e.id));
      if (rangeStart) paidTipsQuery = paidTipsQuery.gte('created_at', rangeStart.toISOString());
      const { data: paidTipsData, error: paidTipsError } = await paidTipsQuery;
      // If table doesn't exist, use empty array
      const safePaidTipsData = paidTipsError ? [] : (paidTipsData || []);
      
      // Sum tips per employee
      const tipsByEmployee = employees.map(emp => {
        const empTips = tipsData.filter(t => t.employee_id === emp.id);
        const empPaidTips = safePaidTipsData.filter(t => t.employee_id === emp.id);
        const totalOwed = empTips.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalPaid = empPaidTips.reduce((sum, t) => sum + (t.amount || 0), 0);
        return { 
          id: emp.id,
          name: emp.name, 
          totalOwed,
          totalPaid,
          netOwed: totalOwed - totalPaid
        };
      });
      setTips(tipsByEmployee);
    } catch (err) {
      console.error('Error fetching tips:', err);
      setError('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tips
  const filteredAndSortedTips = useMemo(() => {
    let filtered = tips;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'amount') {
        aValue = a.netOwed;
        bValue = b.netOwed;
      } else {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [tips, searchQuery, sortBy, sortDirection]);

  // Calculate total owed (only from tips, not considering paid amounts)
  const totalOwed = tips.reduce((sum, emp) => sum + emp.totalOwed, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading employee tips...</Text>
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
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          <ScrollView style={{ flex: 1 }} onContentSizeChange={(w, h) => setContentHeight(h)}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}>
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Employee Tips</Text>
              </View>

              {/* Search and Sort Controls */}
              <GlassCard style={{ marginBottom: 16 }} borderRadius={16}>
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainerExtended}>
                    <FontAwesome name="search" size={16} color={COLORS.text.white} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by employee name..."
                      placeholderTextColor={COLORS.text.white}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                </View>
                <View style={styles.sortContainerBelow}>
                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'amount' && styles.sortButtonActive]}
                    onPress={() => {
                      if (sortBy === 'amount') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('amount');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <Text style={styles.sortButtonText}>
                      Amount {sortBy === 'amount' && `(${sortDirection === 'desc' ? 'High to Low' : 'Low to High'})`}
                    </Text>
                    {sortBy === 'amount' && (
                      <FontAwesome 
                        name={sortDirection === 'asc' ? 'sort-up' : 'sort-down'} 
                        size={12} 
                        color={COLORS.text.white} 
                        style={styles.sortIcon}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeRangeButton}
                    onPress={() => setShowTimeRangeModal(true)}
                  >
                    <Text style={styles.timeRangeButtonText}>
                      {timeRanges.find(r => r.value === timeRange)?.label || 'Select Range'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
              
              {/* Total Owed Section */}
              <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
                <Text style={styles.sectionTitle}>
                  {(() => {
                    switch (timeRange) {
                      case 'all': return 'Total Owed (All Time)';
                      case 'day': return 'Total Owed (Today)';
                      case 'week': return 'Total Owed (This Week)';
                      case 'month': return 'Total Owed (This Month)';
                      case '3month': return 'Total Owed (Last 3 Months)';
                      case '6month': return 'Total Owed (Last 6 Months)';
                      case 'year': return 'Total Owed (This Year)';
                      default: return 'Total Owed';
                    }
                  })()}
                </Text>
                <View style={styles.totalOwedContainer}>
                  <Text style={styles.totalOwedAmount}>${(totalOwed / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
              </GlassCard>

              {/* Employee Tips Table */}
              <GlassCard style={{ marginBottom: 24 }} borderRadius={16}>
                <Text style={styles.sectionTitle}>Employee Tips Breakdown</Text>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 6 }}>
                  <Text style={[styles.tableHeader, { flex: 2 }]}>Employee</Text>
                  <Text style={[styles.tableHeader, { flex: 1, textAlign: 'right' }]}>Amount Owed</Text>
                  <Text style={[styles.tableHeader, { flex: 1, textAlign: 'right' }]}>Amount Paid</Text>
                  <Text style={[styles.tableHeader, { flex: 1, textAlign: 'right' }]}>Net Owed</Text>
                </View>
                {filteredAndSortedTips.map((emp, idx) => (
                  <View key={emp.id} style={[styles.employeeRow, idx < filteredAndSortedTips.length - 1 && styles.employeeRowBorder]}>
                    <Text style={styles.employeeName}>{emp.name}</Text>
                    <Text style={styles.employeeAmount}>${(emp.totalOwed / 100).toFixed(2)}</Text>
                    <Text style={styles.employeeAmount}>${(emp.totalPaid / 100).toFixed(2)}</Text>
                    <Text style={styles.employeeAmount}>
                      ${(emp.netOwed / 100).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {filteredAndSortedTips.length === 0 && (
                  <Text style={styles.noDataText}>
                    {searchQuery ? 'No employees found matching your search.' : 'No tips recorded yet.'}
                  </Text>
                )}
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Time Range Modal */}
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
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
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
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.white,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputContainerExtended: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 0,
    minWidth: 260,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.white,
    fontSize: 16,
    paddingVertical: 8,
  },
  timeRangeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  timeRangeButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sortContainerBelow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sortIcon: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  totalOwedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalOwedAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  employeeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.secondary,
  },
  employeeName: {
    fontSize: 16,
    color: COLORS.text.white,
    flex: 2,
  },
  employeeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
    flex: 1,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.text.white,
    textAlign: 'center',
    marginTop: 32,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
}); 