import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, phone_number')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUsername(data.username || '');
        // Split full name into components
        const nameParts = (data.full_name || '').split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts[nameParts.length - 1] || '');
        setMiddleName(nameParts.slice(1, -1).join(' ') || '');
        setSuffix('');
        
        // Split phone number into country code and number
        const phone = data.phone_number || '';
        if (phone.startsWith('+')) {
          const parts = phone.split(' ');
          setCountryCode(parts[0] || '');
          setPhoneNumber(parts.slice(1).join(' ') || '');
        } else {
          setCountryCode('+1');
          setPhoneNumber(phone);
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Combine name parts
      const fullName = [firstName, middleName, lastName, suffix]
        .filter(Boolean)
        .join(' ');

      // Combine phone parts
      const fullPhoneNumber = [countryCode, phoneNumber]
        .filter(Boolean)
        .join(' ');

      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        phone_number: fullPhoneNumber,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Confirm Logout',
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
              console.log('Attempting to logout...');
              const { error } = await supabase.auth.signOut();
              if (error) {
                console.error('Logout error:', error);
                throw error;
              }
              console.log('Logout successful');
              // Navigate to the login screen after successful logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Middle Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Middle Name"
          value={middleName}
          onChangeText={setMiddleName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Suffix</Text>
        <TextInput
          style={styles.input}
          placeholder="Suffix (Jr., Sr., III, etc.)"
          value={suffix}
          onChangeText={setSuffix}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneContainer}>
          <TextInput
            style={[styles.input, styles.countryCode]}
            placeholder="+1"
            value={countryCode}
            onChangeText={setCountryCode}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.phoneNumber]}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={updateProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: COLORS.surface.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: COLORS.text.white,
    backgroundColor: COLORS.surface.secondary,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  countryCode: {
    flex: 0.3,
  },
  phoneNumber: {
    flex: 0.7,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF0000',
    marginTop: 20,
  },
}); 