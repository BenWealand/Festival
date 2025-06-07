// Explicitly point dotenv to the .env file in the same directory as this script
require('dotenv').config({ path: `${__dirname}/.env` });

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const https = require('https');
const stripeWebhook = require('./stripe-webhook');
const { createClient } = require('../lib/supabaseServer'); // Import the createClient function

const app = express();
const port = process.env.PORT || 3000;

// Basic Input Validation
if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OAUTH_CALLBACK_URL || !process.env.APP_OAUTH_SUCCESS_REDIRECT_URL || !process.env.APP_OAUTH_FAILURE_REDIRECT_URL || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("FATAL ERROR: Missing required environment variables. Check server/.env file.");
    process.exit(1); // Exit if essential config is missing
}

// Middleware (Global)
// Configure CORS carefully for production
app.use(cors());

// Add a general request logger to see if any requests are hitting Express
app.use((req, res, next) => {
  console.log(`[Request Logger] Received: ${req.method} ${req.originalUrl}`);
  next();
});

// Special handling for Stripe webhooks - must be raw body
app.post('/api/stripe-webhook/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Parse JSON bodies for all other routes
app.use(express.json());

// --- General Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('=== UNHANDLED ERROR IN MIDDLEWARE PIPELINE ===');
    console.error('Error:', err);
    console.error('Error Stack:', err.stack);
    console.error('Request URL:', req.originalUrl);
    console.error('Request Method:', req.method);
    // Don't send error details to client in production
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: err.message || 'An unexpected error occurred',
    });
});

// --- Endpoint 2: Create Payment Intent (Defined first) ---
app.post('/create-payment-intent', express.json(), async (req, res) => {
    console.log('=== START CREATE PAYMENT INTENT ===');
    console.log('Request body:', req.body);
    const { amount, locationId, userId } = req.body;

    if (!amount || !locationId || !userId) {
        console.log('Missing required fields:', { amount, locationId, userId });
        return res.status(400).json({ error: 'Amount, locationId, and userId are required' });
    }

    // Initialize Supabase client for this specific request
    const supabaseServiceRole = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });

    try {
        // Get the location's Stripe account ID from Supabase (using service role client)
        console.log('Fetching location from Supabase...');
        const { data: location, error: locationError } = await supabaseServiceRole
            .from('locations')
            .select('stripe_account_id')
            .eq('id', locationId)
            .single();

        if (locationError) {
            console.error('Supabase error:', locationError);
            return res.status(404).json({ error: 'Location not found or no Stripe account connected' });
        }

        if (!location) {
            console.error('No location found for ID:', locationId);
            return res.status(404).json({ error: 'Location not found' });
        }

        if (!location.stripe_account_id) {
            console.error('Location has no Stripe account:', location);
            return res.status(404).json({ error: 'Location has no Stripe account connected' });
        }

        // Create a payment intent with the connected account
        console.log('Creating Stripe payment intent...');
        console.log('Payment intent params:', {
            amount,
            currency: 'usd',
            application_fee_amount: Math.round(amount * 0.05),
            destination: location.stripe_account_id,
            metadata: { user_id: userId, location_id: locationId }
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Already in cents from frontend
            currency: 'usd',
            application_fee_amount: Math.round(amount * 0.05), // 5% platform fee
            transfer_data: {
                destination: location.stripe_account_id,
            },
            metadata: { // Include user_id and location_id in metadata
                user_id: userId,
                location_id: locationId,
            },
        });

        console.log('Payment intent created successfully:', paymentIntent.id);
        console.log('=== END CREATE PAYMENT INTENT ===');
        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        console.log('=== END CREATE PAYMENT INTENT (WITH ERROR) ===');
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoint 1: Stripe OAuth Callback (Defined after) ---
// NOTE: The path here MUST match OAUTH_CALLBACK_URL in .env and Stripe settings
app.get('/api/stripe-callback', async (req, res) => {
    console.log('=== START STRIPE OAUTH CALLBACK ===');
    console.log('Full request URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('Query parameters:', req.query);
    console.log('Headers:', req.headers);
    console.log('Environment variables:');
    console.log('- APP_OAUTH_SUCCESS_REDIRECT_URL:', process.env.APP_OAUTH_SUCCESS_REDIRECT_URL);
    console.log('- APP_OAUTH_FAILURE_REDIRECT_URL:', process.env.APP_OAUTH_FAILURE_REDIRECT_URL);

    const { code, state } = req.query;

    if (!code || !state) {
        console.error('Missing code or state in callback');
        const redirectUrl = `${process.env.APP_OAUTH_FAILURE_REDIRECT_URL}?error=missing_params`;
        console.log('Redirecting to:', redirectUrl);
        return res.redirect(redirectUrl);
    }

    let parsedState;
    try {
        parsedState = JSON.parse(state);
        console.log('Successfully parsed state:', parsedState);

        if (!parsedState.csrf || !parsedState.locationId || !parsedState.userId) {
            throw new Error('Invalid state parameter structure');
        }
    } catch (error) {
        console.error('State parsing error:', error);
        const redirectUrl = `${process.env.APP_OAUTH_FAILURE_REDIRECT_URL}?error=invalid_state`;
        console.log('Redirecting to:', redirectUrl);
        return res.redirect(redirectUrl);
    }

    // Initialize Supabase client for this specific request (for updating location)
    const supabaseServiceRole = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });

    try {
        console.log('Exchanging authorization code for access token...');
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code: code,
        });
        console.log('Stripe OAuth token response received');

        const connectedAccountId = response.stripe_user_id;
        console.log('Connected Account ID:', connectedAccountId);

        if (!connectedAccountId) {
            throw new Error('Failed to retrieve connected account ID from Stripe.');
        }

        console.log('Updating Supabase...');
        const { data, error: updateError } = await supabaseServiceRole
            .from('locations')
            .update({ stripe_account_id: connectedAccountId })
            .eq('id', parsedState.locationId)
            .select('id, name, stripe_account_id');

        if (updateError) {
            console.error('Supabase update error:', updateError);
            throw new Error(`Failed to update location record: ${updateError.message}`);
        }

        console.log('Supabase update successful:', data);

        const successUrl = `${process.env.APP_OAUTH_SUCCESS_REDIRECT_URL}?locationId=${parsedState.locationId}`;
        console.log('Redirecting to success URL:', successUrl);
        console.log('=== END STRIPE OAUTH CALLBACK ===');
        return res.redirect(successUrl);
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        const failureUrl = `${process.env.APP_OAUTH_FAILURE_REDIRECT_URL}?error=${encodeURIComponent(error.message)}`;
        console.log('Redirecting to failure URL:', failureUrl);
        console.log('=== END STRIPE OAUTH CALLBACK (WITH ERROR) ===');
        return res.redirect(failureUrl);
    }
});

// Create HTTPS server with self-signed certificates
const httpsOptions = {
  key: fs.readFileSync(`${__dirname}/certs/key.pem`),
  cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};

// Start the HTTPS server on 127.0.0.1
https.createServer(httpsOptions, app).listen(port, '127.0.0.1', () => {
  console.log(`HTTPS Server running on https://127.0.0.1:${port}`);
}); 