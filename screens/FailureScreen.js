import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FailureScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Failed to connect with Stripe. Please try again.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: 'red',
  },
});

export default FailureScreen; 