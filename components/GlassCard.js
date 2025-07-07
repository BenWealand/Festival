import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GLASS_GRADIENT_COLORS } from '../constants/theme';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const GlassCard = ({ children, style, borderRadius = 24 }) => {
  const colorOrder = useMemo(() => shuffle([
    GLASS_GRADIENT_COLORS.primary,
    GLASS_GRADIENT_COLORS.secondary,
    GLASS_GRADIENT_COLORS.tertiary,
  ]), []);

  return (
    <View style={[styles.shadowWrapper, style]}>
      <View style={[styles.softShadow, { borderRadius: borderRadius + 16 }]} />
      <View style={[styles.cardContainer, { borderRadius }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="glass-linear" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colorOrder[0]} stopOpacity=".7" />
              <Stop offset="50%" stopColor={colorOrder[1]} stopOpacity=".7" />
              <Stop offset="100%" stopColor={colorOrder[2]} stopOpacity=".7" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glass-linear)" />
        </Svg>
        <View style={styles.blackOverlay} pointerEvents="none" />
        <View style={[styles.innerBorder, { borderRadius }]} pointerEvents="none" />
        <View style={styles.contentView}>
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrapper: {
    marginBottom: 24,
  },
  softShadow: {
    position: 'absolute',
    top: 24,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 24,
    zIndex: 0,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 1,
  },
  blackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 2,
  },
  contentView: {
    padding: 16,
    zIndex: 3,
    pointerEvents: 'box-none',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 4,
  },
});

export default GlassCard; 