import React, { useState } from 'react'
import { Alert, StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { COLORS } from '../constants/theme'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasMinLength = password.length >= 6
    return hasUpperCase && hasMinLength
  }

  const getPasswordRequirements = () => {
    return {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password)
    }
  }

  const renderPasswordRequirements = () => {
    const requirements = getPasswordRequirements()
    return (
      <View style={styles.requirementsContainer}>
        <Text style={[styles.requirementText, requirements.length && styles.requirementMet]}>
          • At least 6 characters
        </Text>
        <Text style={[styles.requirementText, requirements.uppercase && styles.requirementMet]}>
          • At least one uppercase letter
        </Text>
      </View>
    )
  }

  async function signInWithEmail() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error
      
      // Navigation will be handled by the parent component through the session state
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signUpWithEmail() {
    if (!validatePassword(password)) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long and contain at least one uppercase letter.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (data?.user) {
        // Create a profile record with the auth user's ID
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error('Error creating user profile');
        }

        Alert.alert(
          'Success', 
          'Account created successfully! Please check your email for the confirmation link.',
          [
            {
              text: 'OK',
              onPress: () => setIsSignUp(false)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Detailed signup error:', error);
      let errorMessage = 'An error occurred while creating your account.';
      
      if (error.message === 'User already registered') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message === 'Error creating user profile') {
        errorMessage = 'Account created but profile setup failed. Please try again.';
      } else if (error.message.includes('Database error')) {
        errorMessage = 'Unable to create account. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {isSignUp && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {renderPasswordRequirements()}
        </>
      )}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => isSignUp ? signUpWithEmail() : signInWithEmail()} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.switchText}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.surface.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: COLORS.text.white,
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
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.text.white,
    fontSize: 16,
  },
  requirementsContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
  },
  requirementText: {
    color: COLORS.text.muted,
    fontSize: 14,
    marginVertical: 2,
  },
  requirementMet: {
    color: COLORS.success,
  },
}) 