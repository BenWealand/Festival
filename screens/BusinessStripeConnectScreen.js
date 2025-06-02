import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';

// Use environment variable directly
const STRIPE_CLIENT_ID = Constants.expoConfig.extra.stripeClientId;
const STRIPE_REDIRECT_URI = Constants.expoConfig.extra.stripeOAuthRedirectUri;

console.log('Stripe Client ID:', STRIPE_CLIENT_ID);
console.log('Stripe Redirect URI:', STRIPE_REDIRECT_URI);

// Define success and failure redirect URIs using the app scheme
const SUCCESS_URI = 'myapp://stripe-connect-success/';
const FAILURE_URI = 'myapp://stripe-connect-failure/';

console.log('=== BusinessStripeConnectScreen loaded ===');

export default function BusinessStripeConnectScreen({ route, navigation }) {
  console.log('Component rendered with locationId:', route.params?.locationId);
  
  const { locationId } = route.params;
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasHandledCallback, setHasHandledCallback] = useState(false);

  // Generate a unique state value for CSRF protection
  const stateValue = useMemo(() => {
    const value = JSON.stringify({
      csrf: Math.random().toString(36).substring(2),
      locationId: locationId,
      userId: user?.id
    });
    console.log('Generated stateValue:', value);
    return value;
  }, [locationId, user?.id]);

  useEffect(() => {
    // Handle deep link when returning from Stripe
    const handleDeepLink = ({ url }) => {
      console.log('=== Deep Link Handler ===');
      console.log('Received URL:', url);
      
      // Prevent multiple callbacks from being processed
      if (hasHandledCallback) {
        console.log('Callback already handled, ignoring');
        return;
      }

      try {
        // Parse the URL to get the query parameters
        const urlObj = new URL(url);
        console.log('Parsed URL:', {
          pathname: urlObj.pathname,
          searchParams: Object.fromEntries(urlObj.searchParams)
        });

        setIsLoading(false);
        setHasHandledCallback(true);

        if (url.includes('stripe-connect-success')) {
          console.log('Stripe connection successful');
          // Get locationId from query parameters
          const returnedLocationId = urlObj.searchParams.get('locationId');
          console.log('Parsed locationId:', returnedLocationId);
          
          Alert.alert(
            'Success',
            'Your Stripe account has been connected successfully.',
            [{ 
              text: 'OK', 
              onPress: () => {
                console.log('Navigating back with locationId:', returnedLocationId);
                navigation.navigate('BusinessLocations', { 
                  refresh: true,
                  connectedLocationId: returnedLocationId 
                });
              }
            }]
          );
        } else if (url.includes('stripe-connect-failure')) {
          console.log('Stripe connection failed');
          const errorMessage = urlObj.searchParams.get('error') || 'Unknown error occurred';
          console.log('Error message:', errorMessage);
          
          Alert.alert(
            'Connection Failed',
            `Could not connect with Stripe: ${errorMessage}`,
            [{ 
              text: 'OK', 
              onPress: () => {
                setHasHandledCallback(false);
                navigation.goBack();
              }
            }]
          );
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
        setIsLoading(false);
        setHasHandledCallback(false);
        Alert.alert('Error', 'Failed to process the Stripe connection response.');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (in case app was opened from a deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, hasHandledCallback]);

  const handleConnectStripe = async () => {
    if (isLoading) return;
    
    console.log('=== handleConnectStripe pressed ===');
    setIsLoading(true);
    setHasHandledCallback(false);
    
    try {
      console.log('Starting OAuth flow...');
      
      // Construct the Stripe OAuth URL manually
      const stripeUrl = `https://connect.stripe.com/oauth/authorize?` +
        `response_type=code` +
        `&client_id=${STRIPE_CLIENT_ID}` +
        `&scope=read_write` +
        `&redirect_uri=${encodeURIComponent(STRIPE_REDIRECT_URI)}` +
        `&state=${encodeURIComponent(stateValue)}` +
        `&success_url=${encodeURIComponent(SUCCESS_URI)}` +
        `&failure_url=${encodeURIComponent(FAILURE_URI)}`;
      
      console.log('Opening URL:', stripeUrl);
      
      // Open URL directly using Linking
      const canOpen = await Linking.canOpenURL(stripeUrl);
      if (canOpen) {
        await Linking.openURL(stripeUrl);
      } else {
        throw new Error('Cannot open Stripe URL');
      }
    } catch (error) {
      console.error("Error during OAuth:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      Alert.alert('Error', 'Could not start the Stripe connection process.');
      setIsLoading(false);
      setHasHandledCallback(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect with Stripe</Text>
      <Text style={styles.description}>
        Securely connect your business to Stripe to enable payments and transfers.
      </Text>
      <Button
        title={isLoading ? "Connecting..." : "Connect with Stripe"}
        onPress={handleConnectStripe}
        disabled={isLoading}
      />
      {isLoading && <ActivityIndicator size="large" color={COLORS.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.text,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: COLORS.text,
  },
}); 