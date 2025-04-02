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
  const [fieldErrors, setFieldErrors] = useState({});

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
          style={[styles.input, fieldErrors.username && styles.inputError]}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        {fieldErrors.username && <Text style={styles.errorText}>{fieldErrors.username}</Text>}

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, fieldErrors.firstName && styles.inputError]}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        {fieldErrors.firstName && <Text style={styles.errorText}>{fieldErrors.firstName}</Text>}

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
          style={[styles.input, fieldErrors.lastName && styles.inputError]}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        {fieldErrors.lastName && <Text style={styles.errorText}>{fieldErrors.lastName}</Text>}

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
            onChangeText={(text) => {
              // Ensure country code starts with +
              const formattedText = text.startsWith('+') ? text : `+${text}`;
              setCountryCode(formattedText);
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.phoneNumber, fieldErrors.phoneNumber && styles.inputError]}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>
        {fieldErrors.phoneNumber && <Text style={styles.errorText}>{fieldErrors.phoneNumber}</Text>}
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
  },
  countryCode: {
    width: 80,
  },
  phoneNumber: {
    flex: 1,
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
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
}); 