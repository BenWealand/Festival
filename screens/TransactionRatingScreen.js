import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function TransactionRatingScreen({ route, navigation }) {
  const { transactionId, transaction } = route.params || {};
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      setSubmitting(true);

      // Update transaction with rating
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ rating })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Call RPC function to update business metrics
      const { error: rpcError } = await supabase
        .rpc('update_business_metrics', {
          p_location_id: transaction.location_id
        });

      if (rpcError) throw rpcError;

      Alert.alert('Success', 'Thank you for your rating!');
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onPress }) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            disabled={submitting}
          >
            <FontAwesome
              name={star <= rating ? 'star' : 'star-o'}
              size={40}
              color={COLORS.primary}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!transactionId || !transaction) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid transaction</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate Your Experience</Text>
      <Text style={styles.subtitle}>How was your transaction?</Text>
      
      <StarRating 
        rating={rating} 
        onPress={setRating} 
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmitRating}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.muted,
    marginBottom: 30,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  star: {
    marginHorizontal: 10,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
}); 