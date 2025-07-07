import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const Bloom = ({ color, style }) => (
  <View style={[styles.bloomContainer, style]}>
    <Svg height="100%" width="100%">
      <Defs>
        <RadialGradient id={`grad-${color}`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#grad-${color})`} />
    </Svg>
  </View>
);

export const GlaringSegment = ({ children, style, contentStyle }) => {
  return (
    <View style={[styles.segmentContainer, style]}>
      <View style={[styles.segment, contentStyle]}>{children}</View>
      <View style={styles.footer}>
        <Bloom color="hsl(199, 89%, 48%)" style={{ left: '10%', width: '40%' }} />
        <Bloom color="hsl(330, 81%, 60%)" style={{ left: '23%', width: '40%' }} />
        <Bloom color="hsl(25, 95%, 53%)" style={{ left: '36%', width: '40%' }} />
        <Bloom color="hsl(271, 91%, 65%)" style={{ left: '50%', width: '40%' }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  segmentContainer: {},
  segment: {
    zIndex: 1,
    paddingHorizontal: 12,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
  },
  footer: {
    position: 'absolute',
    bottom: -80,
    left: 0,
    right: 0,
    zIndex: 0,
    width: '100%',
    height: 100,
  },
  bloomContainer: {
    position: 'absolute',
    height: 100,
  },
}); 