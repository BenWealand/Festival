import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const SuccessScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Success! You have connected with Stripe.</Text>
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
    color: 'green',
  },
});

export default SuccessScreen; 