import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
  });
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist yet
          setIsNewUser(true);
        } else if (error) {
          throw error;
        } else if (data) {
          setFormData({
            username: data.username || '',
            full_name: data.full_name || '',
          });
          setIsNewUser(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      // Validate form data
      if (!formData.username.trim()) {
        Alert.alert('Error', 'Username is required');
        return;
      }

      if (!formData.full_name.trim()) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        Alert.alert('Error', 'Username is already taken');
        return;
      }

      // Create or update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', isNewUser ? 'Profile created successfully' : 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2089dc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {isNewUser && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome to Festival App!</Text>
            <Text style={styles.welcomeSubtext}>Please complete your profile to get started.</Text>
          </View>
        )}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Choose a username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.full_name}
            onChangeText={(text) => setFormData({ ...formData, full_name: text })}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={updateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Updating...' : isNewUser ? 'Create Profile' : 'Update Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  welcomeContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2089dc',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2089dc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 