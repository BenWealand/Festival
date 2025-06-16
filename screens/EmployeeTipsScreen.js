import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

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
      // Sum tips per employee
      const tipsByEmployee = employees.map(emp => {
        const empTips = tipsData.filter(t => t.employee_id === emp.id);
        const total = empTips.reduce((sum, t) => sum + (t.amount || 0), 0);
        return { name: emp.name, total };
      });
      setTips(tipsByEmployee);
    } catch (err) {
      setError('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface.primary }}>
      {/* Header: Title and Time Range Selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.primary, flex: 1 }}>Employee Tips</Text>
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
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : error ? (
        <Text style={{ color: COLORS.error, margin: 16 }}>{error}</Text>
      ) : tips.length === 0 ? (
        <Text style={{ color: COLORS.text.muted, margin: 16 }}>No tips recorded yet.</Text>
      ) : (
        <ScrollView style={{ marginHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {tips.map((emp, idx) => (
              <View key={idx} style={{ width: Dimensions.get('window').width / 2 - 28, margin: 8, alignItems: 'center' }}>
                <Text style={{ color: COLORS.text.white, fontWeight: '600', fontSize: 16, marginBottom: 8 }}>{emp.name}</Text>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 18, minWidth: 80, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.text.white, fontWeight: 'bold', fontSize: 20 }}>${(emp.total / 100).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
} 