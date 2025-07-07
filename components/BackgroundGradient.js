import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BACKGROUND_BASE } from '../constants/theme';

const BackgroundGradient = ({ children, style }) => (
  <View style={[styles.container, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_BASE,
  },
});

export default BackgroundGradient; 