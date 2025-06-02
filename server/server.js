// Explicitly point dotenv to the .env file in the same directory as this script
require('dotenv').config({ path: `${__dirname}/.env` });

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const https = require('https');
const stripeWebhook = require('./stripe-webhook');
const { supabaseServer } = require('../lib/supabaseServer'); // Import the backend client

const app = express();
const port = process.env.PORT || 3000;

// Basic Input Validation
if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OAUTH_CALLBACK_URL || !process.env.APP_OAUTH_SUCCESS_REDIRECT_URL || !process.env.APP_OAUTH_FAILURE_REDIRECT_URL || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("FATAL ERROR: Missing required environment variables. Check server/.env file.");
    process.exit(1); // Exit if essential config is missing
}

// Initialize Supabase client (using Service Role Key for backend operations)
const supabase = supabaseServer; // Use the imported backend client

// Middleware
// Configure CORS carefully for production
app.use(cors());

// Special handling for Stripe webhooks - must be raw body
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe-webhook', stripeWebhook);

// Parse JSON for all other routes
app.use(express.json());

// --- Endpoint 1: Stripe OAuth Callback ---
// NOTE: The path here MUST match OAUTH_CALLBACK_URL in .env and Stripe settings
app.get('/api/stripe-callback', async (req, res) => {
    const { code, state } = req.query;
    console.log('=== START STRIPE OAUTH CALLBACK ===');
    console.log('Full request URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('Query parameters:', req.query);
    console.log('Headers:', req.headers);
    console.log('Environment variables:');
    console.log('- APP_OAUTH_SUCCESS_REDIRECT_URL:', process.env.APP_OAUTH_SUCCESS_REDIRECT_URL);
    console.log('- APP_OAUTH_FAILURE_REDIRECT_URL:', process.env.APP_OAUTH_FAILURE_REDIRECT_URL);

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
        const { data, error: updateError } = await supabase
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

// --- Endpoint 2: Create Payment Intent ---
app.post('/create-payment-intent', async (req, res) => {
    const { amount, locationId } = req.body;

    if (!amount || !locationId) {
        return res.status(400).json({ error: 'Amount and locationId are required' });
    }

    try {
        // Get the location's Stripe account ID from Supabase
        const { data: location, error: locationError } = await supabase
            .from('locations')
            .select('stripe_account_id')
            .eq('id', locationId)
            .single();

        if (locationError || !location) {
            return res.status(404).json({ error: 'Location not found or no Stripe account connected' });
        }

        // Create a payment intent with the connected account
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Already in cents from frontend
            currency: 'usd',
            application_fee_amount: Math.round(amount * 0.05), // 5% platform fee
            transfer_data: {
                destination: location.stripe_account_id,
            }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create HTTPS server with self-signed certificates
const httpsOptions = {
  key: fs.readFileSync(`${__dirname}/certs/key.pem`),
  cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};

// Start the HTTPS server
https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`HTTPS Server running on port ${port}`);
}); 