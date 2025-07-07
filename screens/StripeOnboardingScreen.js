import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { stripe } from '../lib/stripe';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StripeOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onboardingUrl, locationId } = route.params;
  const [loading, setLoading] = useState(true);

  const checkAccountStatus = async () => {
    try {
      // Get the location's Stripe account ID
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('stripe_account_id')
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;
      if (!location.stripe_account_id) {
        throw new Error('No Stripe account found for this location');
      }

      // Check the account status with Stripe
      const account = await stripe.accounts.retrieve(location.stripe_account_id);
      
      if (account.charges_enabled && account.payouts_enabled) {
        Alert.alert(
          'Success',
          'Stripe account setup complete! You can now accept payments.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error checking account status:', err);
      // Don't show error to user as they might still be in the onboarding process
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: onboardingUrl }}
        onNavigationStateChange={(navState) => {
          // Check account status when returning from Stripe
          if (typeof navState.url === 'string' && navState.url.includes('/onboarding/success')) {
            checkAccountStatus();
          }
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Stripe onboarding...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.text.white,
    fontSize: 16,
  },
}); 