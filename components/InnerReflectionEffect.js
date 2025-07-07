import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

export const InnerReflectionEffect = ({
  width,
  height,
  opacity,
}) => {
  const safeWidth = typeof width === 'number' && !isNaN(width) && width > 0 ? width : 1;
  const safeHeight = typeof height === 'number' && !isNaN(height) && height > 0 ? height : 1;
  const glareSize = safeWidth * 1.2;
  return (
    <MotiView
      style={[
        styles.positionAbsolute,
        styles.innerBorder,
        {
          top: (safeHeight - glareSize) / 2,
          left: (safeWidth - glareSize) / 2,
          width: glareSize,
          height: glareSize,
          opacity,
        },
      ]}
      from={{ rotate: '0deg' }}
      animate={{ rotate: '360deg' }}
      transition={{
        loop: true,
        type: 'timing',
        repeatReverse: false,
        duration: 8000,
        easing: Easing.linear,
      }}
    >
      <Svg style={[styles.positionAbsolute]} viewBox={`0 0 ${glareSize} ${glareSize}`}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="hsla(0, 100%, 100%, 1)" stopOpacity="1" />
            <Stop offset="0.49" stopColor="hsla(0, 100%, 100%, 1)" stopOpacity="0.2" />
            <Stop offset="0.5" stopColor="hsla(0, 100%, 100%, 1)" stopOpacity="1" />
            <Stop offset="1" stopColor="hsla(0, 100%, 100%, 1)" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
      </Svg>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  positionAbsolute: {
    position: 'absolute',
  },
  innerBorder: {
    opacity: 0.5,
    zIndex: 1,
  },
}); 