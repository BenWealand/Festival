import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import { isLocationOwner } from './supabase';
import { YOUR_BACKEND_API_URL } from '@env';

const STRIPE_SECRET_KEY = Constants.expoConfig.extra.stripeSecretKey;

/**
 * Creates a Payment Intent for a user paying a specific location.
 * IMPORTANT: This function MUST call your secure backend endpoint.
 * It should NOT interact with the Stripe API directly using secret keys.
 */
export const createPaymentIntentForLocation = async (locationId, amountInCents) => {
  try {
    // Use backend API endpoint URL from .env
    const response = await fetch(`${YOUR_BACKEND_API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include authentication headers if needed (e.g., JWT token)
        // 'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        locationId: locationId,
        amount: amountInCents, // Ensure amount is in cents
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment intent');
    }

    // The backend should return the client_secret
    if (!data.clientSecret) {
      throw new Error('Missing client_secret from backend response');
    }

    return { clientSecret: data.clientSecret };

  } catch (error) {
    console.error('Error creating payment intent via backend:', error);
    throw error; // Re-throw to be handled by the calling component
  }
};

// --- Other potential functions related to payments (e.g., retrieving publishable key) --- 