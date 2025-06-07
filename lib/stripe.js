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
export const createPaymentIntentForLocation = async (locationId, amountInCents, userId) => {
  try {
    // Debug logging
    console.log('Backend URL:', YOUR_BACKEND_API_URL);
    console.log('Full request URL:', `${YOUR_BACKEND_API_URL}/create-payment-intent`);
    console.log('Request headers:', {
      'Content-Type': 'application/json',
    });
    console.log('Request body:', {
      locationId,
      amount: amountInCents,
      userId: userId,
    });

    // Use backend API endpoint URL from .env
    const response = await fetch(`${YOUR_BACKEND_API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: locationId,
        amount: amountInCents, // Ensure amount is in cents
        userId: userId,
      }),
    });

    // Debug logging for response
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      // Include the backend error message in the thrown error
      throw new Error(data.error || data.message || 'Failed to create payment intent');
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