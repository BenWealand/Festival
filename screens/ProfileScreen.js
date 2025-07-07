import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import nameBlacklist from '../nameBlacklist.json';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import GlassCard from '../components/GlassCard';
import BackgroundGradient from '../components/BackgroundGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MeteorBackground from '../components/MeteorBackground';

// Blacklist of inappropriate words/phrases (imported from JSON)
function containsBlacklistedWord(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return nameBlacklist.some(word => lower.includes(word));
}

export default function ProfileScreen(props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'rewards', 'notifications', 'help'
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [contentHeight, setContentHeight] = useState(0);
  const radialGradients = useMemo(() => [
    { id: 'profile-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'profile-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);
  const [notifications, setNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [transactionNotifications, setTransactionNotifications] = useState(true);
  const [rewardNotifications, setRewardNotifications] = useState(true);
  const [eventNotifications, setEventNotifications] = useState(true);
  const [appUpdateNotifications, setAppUpdateNotifications] = useState(true);

  useEffect(() => {
    fetchProfile();
    
    // Subscribe to profile changes
    const subscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.new) {
            updateLocalProfile(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateLocalProfile = (data) => {
    setUsername(data.username || '');
    const nameParts = (data.full_name || '').split(' ');
    setFirstName(nameParts[0] || '');
    setLastName(nameParts[nameParts.length - 1] || '');
    setMiddleName(nameParts.slice(1, -1).join(' ') || '');
    setSuffix('');
    
    // Handle phone number with country code
    const phone = data.phone_number || '';
    if (phone) {
      // If phone starts with +, extract country code
      if (phone.startsWith('+')) {
        const spaceIndex = phone.indexOf(' ');
        if (spaceIndex !== -1) {
          setCountryCode(phone.substring(0, spaceIndex));
          setPhoneNumber(phone.substring(spaceIndex + 1));
        } else {
          // If no space, assume first 3 digits are country code
          setCountryCode(phone.substring(0, 3));
          setPhoneNumber(phone.substring(3));
        }
      } else {
        // Default to US country code if no + present
        setCountryCode('+1');
        setPhoneNumber(phone);
      }
    } else {
      setCountryCode('+1');
      setPhoneNumber('');
    }
  };

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, phone_number')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        updateLocalProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const validateFields = () => {
    const errors = {};
    if (!username.trim()) errors.username = 'Username is required';
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    
    // Blacklist check for all name fields
    if (containsBlacklistedWord(username)) errors.username = 'Inappropriate words are not allowed in your username.';
    if (containsBlacklistedWord(firstName)) errors.firstName = 'Inappropriate words are not allowed in your first name.';
    if (containsBlacklistedWord(middleName)) errors.middleName = 'Inappropriate words are not allowed in your middle name.';
    if (containsBlacklistedWord(lastName)) errors.lastName = 'Inappropriate words are not allowed in your last name.';
    if (containsBlacklistedWord(suffix)) errors.suffix = 'Inappropriate words are not allowed in your suffix.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function updateProfile() {
    if (!validateFields()) {
      return;
    }

    try {
      setSaving(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      console.log('Current user ID:', user.id);

      const fullName = [firstName, middleName, lastName, suffix]
        .filter(Boolean)
        .join(' ');

      // Ensure country code is properly formatted
      const formattedCountryCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
      const fullPhoneNumber = `${formattedCountryCode} ${phoneNumber}`.trim();

      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        phone_number: fullPhoneNumber,
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to save profile with data:', updates);

      // First check if the profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert(updates);
      }

      if (result.error) {
        console.error('Error saving profile:', result.error);
        throw result.error;
      }

      console.log('Profile saved successfully:', result.data);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error',
        `Failed to update profile: ${error.message}\n\nPlease check your internet connection and try again.`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  }

  // Tab bar component
  const renderTabBar = () => (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        marginBottom: 16,
        backgroundColor: 'transparent',
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {[
          { key: 'profile', label: 'Profile' },
          { key: 'rewards', label: 'Rewards' },
          { key: 'notifications', label: 'Notification Settings' },
          { key: 'help', label: 'Help & Policies' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeTab === tab.key ? COLORS.primary : 'transparent',
              alignItems: 'center',
              backgroundColor: 'transparent',
              marginRight: 4,
            }}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={{
                color: COLORS.text.white,
                fontWeight: activeTab === tab.key ? 'bold' : '600',
                fontSize: 14,
                textAlign: 'center',
                minWidth: 60,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Tab content
  const renderTabContent = () => {
    if (activeTab === 'profile') {
  if (loading) {
    return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_BASE }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <GlassCard style={{ margin: 16 }} borderRadius={16}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, fieldErrors.username && styles.inputError]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              {fieldErrors.username && <Text style={styles.errorText}>{fieldErrors.username}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, fieldErrors.firstName && styles.inputError]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              {fieldErrors.firstName && <Text style={styles.errorText}>{fieldErrors.firstName}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle Name (Optional)</Text>
              <TextInput
                style={[styles.input, fieldErrors.middleName && styles.inputError]}
                value={middleName}
                onChangeText={setMiddleName}
                placeholder="Enter middle name"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              {fieldErrors.middleName && <Text style={styles.errorText}>{fieldErrors.middleName}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, fieldErrors.lastName && styles.inputError]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              {fieldErrors.lastName && <Text style={styles.errorText}>{fieldErrors.lastName}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Suffix (Optional)</Text>
              <TextInput
                style={[styles.input, fieldErrors.suffix && styles.inputError]}
                value={suffix}
                onChangeText={setSuffix}
                placeholder="e.g., Jr., Sr., III"
                placeholderTextColor="rgba(255,255,255,0.7)"
              />
              {fieldErrors.suffix && <Text style={styles.errorText}>{fieldErrors.suffix}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={[styles.phoneCountryCode, fieldErrors.phoneNumber && styles.inputError]}
                  value={countryCode}
                  onChangeText={setCountryCode}
                  placeholder="+1"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                />
                <TextInput
                  style={[styles.phoneNumber, fieldErrors.phoneNumber && styles.inputError]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  keyboardType="phone-pad"
                />
              </View>
              {fieldErrors.phoneNumber && <Text style={styles.errorText}>{fieldErrors.phoneNumber}</Text>}
            </View>

            <TouchableOpacity
              onPress={updateProfile}
              style={{
                backgroundColor: BACKGROUND_RADIAL,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginVertical: 16,
                width: '100%',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: COLORS.error,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 8,
                width: '100%',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Log Off</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      );
    }
    if (activeTab === 'rewards') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.text.white, fontSize: 18, fontWeight: 'bold' }}>Rewards</Text>
          <Text style={{ color: COLORS.text.white, marginTop: 12 }}>Your rewards and loyalty information will appear here.</Text>
        </View>
      );
    }
    if (activeTab === 'notifications') {
      const sectionStyle = {
        backgroundColor: BACKGROUND_RADIAL + 'cc',
        borderRadius: 14,
        padding: 16,
        marginBottom: 18,
        marginTop: 2,
      };
      const itemStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
      };
      const checkColor = COLORS.primary;
      const labelStyle = { color: '#fff', fontSize: 15, marginLeft: 10, fontWeight: '500' };
      const sectionHeaderStyle = { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1 };
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <GlassCard style={{ padding: 0 }} borderRadius={18}>
            <View style={{ padding: 20, opacity: 1 }}>
              {/* Master toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, flex: 1 }}>Enable Notifications</Text>
                <Switch
                  value={notifications}
                  onValueChange={value => {
                    setNotifications(value);
                  }}
                  trackColor={{ false: '#767577', true: COLORS.primary }}
                  thumbColor={notifications ? COLORS.primary : '#f4f3f4'}
                />
              </View>
              {/* Push, SMS, Email toggles */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, opacity: notifications ? 1 : 0.5 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>Push</Text>
                  <Switch
                    value={pushNotifications}
                    onValueChange={setPushNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={pushNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>SMS</Text>
                  <Switch
                    value={smsNotifications}
                    onValueChange={setSmsNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={smsNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>Email</Text>
                  <Switch
                    value={emailNotifications}
                    onValueChange={setEmailNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={emailNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
              </View>
              {/* Transaction Notifications */}
              <View style={[sectionStyle, { opacity: notifications ? 1 : 0.5 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={sectionHeaderStyle}>Transaction Notifications</Text>
                  <Switch
                    value={transactionNotifications}
                    onValueChange={setTransactionNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={transactionNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Deposit Confirmations</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Balance Updates</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Purchase Receipts</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Refunds / Failed Transactions</Text></View>
              </View>
              {/* Cashback & Rewards */}
              <View style={[sectionStyle, { opacity: notifications ? 1 : 0.5 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={sectionHeaderStyle}>Cashback & Rewards</Text>
                  <Switch
                    value={rewardNotifications}
                    onValueChange={setRewardNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={rewardNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>New Cashback Earned</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Milestone Rewards</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Streaks / Bonuses Ending Soon</Text></View>
              </View>
              {/* Bar Activity & Events */}
              <View style={[sectionStyle, { opacity: notifications ? 1 : 0.5 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={sectionHeaderStyle}>Bar Activity & Events</Text>
                  <Switch
                    value={eventNotifications}
                    onValueChange={setEventNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={eventNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Special Events or Parties</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Happy Hour Reminders</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Line Status / Entry Deals</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Bar Reopening Alerts</Text></View>
              </View>
              {/* App Updates & Announcements */}
              <View style={[sectionStyle, { opacity: notifications ? 1 : 0.5 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={sectionHeaderStyle}>App Updates & Announcements</Text>
                  <Switch
                    value={appUpdateNotifications}
                    onValueChange={setAppUpdateNotifications}
                    disabled={!notifications}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                    thumbColor={appUpdateNotifications ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Feature Drops</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Policy Changes / Terms Updates</Text></View>
                <View style={itemStyle}><FontAwesome name="check-circle" size={18} color={checkColor} /><Text style={labelStyle}>Bug Fix Announcements</Text></View>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      );
    }
    if (activeTab === 'help') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.text.white, fontSize: 18, fontWeight: 'bold' }}>Help & Policies</Text>
          <Text style={{ color: COLORS.text.white, marginTop: 12 }}>Find help and read our policies here.</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom', 'top']}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16, padding: 8 }}>
              <FontAwesome name="arrow-left" size={20} color={COLORS.text.white} />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.text.white }}>Profile</Text>
          </View>
          <View style={{ flex: 1 }}>
            {renderTabBar()}
            {renderTabContent()}
          </View>
        </SafeAreaView>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: COLORS.text.white,
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: COLORS.text.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneCountryCode: {
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: COLORS.text.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  phoneNumber: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: COLORS.text.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 