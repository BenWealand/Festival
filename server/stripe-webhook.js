const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../lib/supabase');

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent) {
  const { 
    id: payment_intent_id,
    customer: stripe_customer_id,
    amount,
    currency,
    metadata
  } = paymentIntent;

  // Create or update transaction
  const { data, error } = await supabase
    .from('transactions')
    .upsert({
      stripe_payment_id: payment_intent_id,
      stripe_customer_id,
      payment_intent_id,
      amount: amount / 100, // Convert from cents to dollars
      currency,
      payment_status: 'succeeded',
      status: 'completed',
      metadata,
      location_id: metadata.location_id,
      customer_name: metadata.customer_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  // Update business metrics
  const { error: metricsError } = await supabase.rpc('update_business_metrics', {
    p_location_id: metadata.location_id,
    p_amount: amount / 100, // Convert from cents to dollars
    p_rating: metadata.rating || null
  });

  if (metricsError) {
    console.error('Error updating business metrics:', metricsError);
    throw metricsError;
  }

  return data;
}

async function handlePaymentIntentFailed(paymentIntent) {
  const { 
    id: payment_intent_id,
    customer: stripe_customer_id,
    metadata
  } = paymentIntent;

  // Update transaction status
  const { error } = await supabase
    .from('transactions')
    .update({
      payment_status: 'failed',
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('payment_intent_id', payment_intent_id);

  if (error) {
    console.error('Error updating failed transaction:', error);
    throw error;
  }
}

async function handleChargeSucceeded(charge) {
  const { 
    id: stripe_payment_id,
    customer: stripe_customer_id,
    payment_intent: payment_intent_id,
    amount,
    currency,
    metadata
  } = charge;

  // Update transaction with charge details
  const { error } = await supabase
    .from('transactions')
    .update({
      stripe_payment_id,
      payment_status: 'succeeded',
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('payment_intent_id', payment_intent_id);

  if (error) {
    console.error('Error updating charge details:', error);
    throw error;
  }
}

async function handleChargeFailed(charge) {
  const { 
    payment_intent: payment_intent_id
  } = charge;

  // Update transaction status
  const { error } = await supabase
    .from('transactions')
    .update({
      payment_status: 'failed',
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('payment_intent_id', payment_intent_id);

  if (error) {
    console.error('Error updating failed charge:', error);
    throw error;
  }
}

module.exports = router; 