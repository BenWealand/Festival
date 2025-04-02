import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function BalanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balance</Text>
      <Text style={styles.subtitle}>View and manage your balance here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.surface.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text.white,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.white,
    opacity: 0.7,
  },
}); 