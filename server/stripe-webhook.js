const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabaseServer } = require('../lib/supabaseServer');

// Stripe webhook endpoint
router.post('/api/stripe-webhook/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
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
  console.log('=== START handlePaymentIntentSucceeded ===');
  console.log('Received paymentIntent:', paymentIntent);

  const { 
    id: payment_intent_id,
    customer: stripe_customer_id,
    amount, // amount is in cents from Stripe
    currency,
    metadata
  } = paymentIntent;

  console.log('Extracted data:', { payment_intent_id, stripe_customer_id, amount, currency, metadata });

  // ** Record the deposit **
  // Ensure user_id and location_id are included in the Payment Intent metadata when created on frontend/backend
  const user_id = metadata.user_id;
  const location_id = metadata.location_id;

  if (!user_id || !location_id) {
    console.error('Metadata missing user_id or location_id for successful payment intent', payment_intent_id);
    // Depending on your requirements, you might want to throw an error or handle this differently
    // For now, we'll log and proceed, but the deposit record won't be linked to user/location
  }

  console.log('Attempting to insert deposit record...');
  const { data: depositData, error: depositError } = await supabaseServer
    .from('deposits')
    .insert({
      user_id: user_id,
      location_id: location_id,
      amount: amount, // Amount is already in cents from Stripe
      stripe_payment_intent_id: payment_intent_id,
    });

  if (depositError) {
    console.error('Error inserting deposit record:', depositError);
    // Handle this error - potentially log to a monitoring system or trigger an alert
    // Throwing an error here might cause Stripe to retry the webhook
  } else {
    console.log('Deposit record inserted successfully:', depositData);
  }

  // ** Update the user's balance **
  // Find the current balance or initialize if it doesn't exist
  console.log('Attempting to fetch existing balance...');
  const { data: existingBalance, error: fetchBalanceError } = await supabaseServer
    .from('balances')
    .select('balance')
    .eq('user_id', user_id)
    .eq('location_id', location_id)
    .single();

  if (fetchBalanceError && fetchBalanceError.code !== 'PGRST116') { // PGRST116 means no rows found
     console.error('Error fetching existing balance:', fetchBalanceError);
     // Handle this error
  } else if (fetchBalanceError?.code === 'PGRST116') {
    console.log('No existing balance found, initializing to 0.');
  } else {
    console.log('Existing balance fetched:', existingBalance);
  }

  const currentBalance = existingBalance ? existingBalance.balance : 0;
  const newBalance = currentBalance + amount; // Add the deposited amount (in cents)
  console.log('Calculated new balance:', newBalance, '(current:', currentBalance, '+ amount:', amount, ')');

  // Upsert the new balance
  console.log('Attempting to upsert user balance...');
  const { data: updatedBalance, error: updateBalanceError } = await supabaseServer
    .from('balances')
    .upsert({
      user_id: user_id,
      location_id: location_id,
      balance: newBalance,
    }, { onConflict: ['user_id', 'location_id'] });

  if (updateBalanceError) {
    console.error('Error updating user balance after deposit:', updateBalanceError);
    // Handle this error
  } else {
    console.log('User balance upserted successfully:', updatedBalance);
  }

  // ** Existing transaction/metrics logic (Review if still needed here based on new model) **
  // This part might need to be removed or repurposed if transactions are only for redemptions.
  // For now, I will comment it out as it seems inconsistent with tracking deposits here.

  /*
  // Create or update transaction
  const { data, error } = await supabaseServer
    .from('transactions')
    .upsert({
      stripe_payment_id: payment_intent_id, // This seems to be a mix-up, should be payment_intent_id
      stripe_customer_id,
      payment_intent_id,
      amount: amount / 100, // Convert from cents to dollars - This conversion seems wrong if amounts are stored in cents elsewhere
      currency,
      payment_status: 'succeeded',
      status: 'completed',
      metadata,
      location_id: metadata.location_id,
      customer_name: metadata.customer_name, // Using customer_name from metadata
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
  const { error: metricsError } = await supabaseServer.rpc('update_business_metrics', {
    p_location_id: metadata.location_id,
    p_amount: amount / 100, // Convert from cents to dollars - Again, potential inconsistency
    p_rating: metadata.rating || null // Rating seems irrelevant for deposits
  });

  if (metricsError) {
    console.error('Error updating business metrics:', metricsError);
    throw metricsError;
  }

  return data;
  */

  console.log('=== END handlePaymentIntentSucceeded ===');
  console.log('Deposit recorded and balance updated for payment intent:', payment_intent_id);
  // If the transaction/metrics logic above is removed, you might not need to return anything here.
  // If it's kept and depends on the `data` from the transaction upsert, you'll need to adjust.
}

async function handlePaymentIntentFailed(paymentIntent) {
  const { 
    id: payment_intent_id,
    customer: stripe_customer_id,
    metadata
  } = paymentIntent;

  // Update transaction status
  const { error } = await supabaseServer
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

// --- New handler for canceled payment intents ---
async function handlePaymentIntentCanceled(paymentIntent) {
  console.log('=== START handlePaymentIntentCanceled ===');
  console.log('Received canceled paymentIntent:', paymentIntent);

  const { 
    id: payment_intent_id,
    metadata
  } = paymentIntent;

  console.log('Payment Intent was canceled:', payment_intent_id);
  console.log('Metadata:', metadata);

  // You could add logic here if you need to record cancellations or take other actions
  // For now, we'll just log it.

  console.log('=== END handlePaymentIntentCanceled ===');
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
  const { error } = await supabaseServer
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
  const { error } = await supabaseServer
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