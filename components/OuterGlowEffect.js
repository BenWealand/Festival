import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

export const OuterGlowEffect = ({
  width,
  height,
  opacity,
}) => {
  const glareSize = width * 1.2;
  return (
    <View
      style={[
        styles.positionAbsolute,
        {
          width,
          height,
          transform: [{ scaleY: 0.5 }],
        },
      ]}
    >
      <MotiView
        style={[
          styles.innerBorder,
          {
            top: (height - glareSize) / 2,
            left: (width - glareSize) / 2,
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
          duration: 10000,
          easing: Easing.linear,
        }}
      >
        <View
          style={[
            styles.positionAbsolute,
            styles.bloom,
            {
              left: glareSize / 3,
              top: glareSize / 2,
              width: 1,
              height: 1,
            },
          ]}
        />
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  positionAbsolute: {
    position: 'absolute',
    zIndex: -1, // behind the button
  },
  innerBorder: {
    opacity: 0.8,
  },
  bloom: {
    borderRadius: 10,
    boxShadow: `
      0 0px 60px 30px rgba(255, 255, 255, 1),
      0 0px 120px 60px rgba(255, 255, 255, 0.8),
      0 0px 200px 100px rgba(255, 255, 255, 0.6)
    `,
  },
}); 