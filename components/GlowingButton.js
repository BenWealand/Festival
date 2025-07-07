import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { InnerReflectionEffect } from './InnerReflectionEffect';
import { OuterGlowEffect } from './OuterGlowEffect';
import { BUTTON_GRADIENT_COLORS, COLORS } from '../constants/theme';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * GlowingButton
 * @param {string} text - Button text
 * @param {string} icon - FontAwesome icon name
 * @param {function} onPress - Press handler
 * @param {number} buttonWidth - Button width (default 170)
 * @param {number} buttonHeight - Button height (default 140)
 * @param {number} borderRadius - Border radius (default 22)
 * @param {object} style - Additional style for outer container
 * @param {object} contentStyle - Additional style for content mask
 * @param {number} fontSize - Font size for text (optional)
 * @param {number} iconSize - Font size for icon (optional)
 * @param {number} textMarginTop - Margin top for text (optional)
 */
const GlowingButton = ({
  text,
  icon,
  onPress,
  buttonWidth = 170,
  buttonHeight = 140,
  borderRadius = 22,
  style = {},
  contentStyle = {},
  fontSize: fontSizeProp,
  iconSize: iconSizeProp,
  textMarginTop,
}) => {
  const [pressed, setPressed] = useState(false);

  // Use only pink colors for the button
  const colors = [
    '#FF69B4', // Hot pink
    '#FF1493', // Deep pink
    '#FFB6C1', // Light pink
    '#FFC0CB', // Pink
  ];

  // Memoize gradients to prevent re-rendering on every state change
  const radialGradients = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
        id: `rad-grad-${i}-${Math.random()}`,
        cx: `${Math.random() * 100}%`,
        cy: `${Math.random() * 100}%`,
        rx: `${80 + Math.random() * 40}%`,
        ry: `${80 + Math.random() * 40}%`,
    }));
  }, []);

  // Calculate dynamic font and icon sizes
  const fontSize = fontSizeProp || Math.max(12, buttonHeight * 0.36);
  const iconSize = iconSizeProp || Math.max(16, buttonHeight * 0.5);
  const marginTop = textMarginTop !== undefined ? textMarginTop : 10;

  return (
    <View style={[styles.container, { width: buttonWidth, height: buttonHeight }, style]}>
      {/* <OuterGlowEffect width={buttonWidth} height={buttonHeight} opacity={0.6} /> */}
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[styles.button, { borderRadius }]}
      >
        {/* Layer 1: The rotating reflection. Sits at the bottom with zIndex: 1. */}
        <InnerReflectionEffect
            width={buttonWidth}
            height={buttonHeight}
            opacity={0.9}
        />

        {/* Layer 2: The content mask. Sits on top of the reflection with zIndex: 2.
            It's slightly smaller than the button, which is what creates the border effect. */}
        <View style={[styles.contentMask, { width: buttonWidth - 6, height: buttonHeight - 6, borderRadius: borderRadius - 3, backgroundColor: COLORS.primary }, contentStyle]}>
            {/* The gradient background - commented out for now */}
            {/* <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    {radialGradients.map(g => (
                        <RadialGradient key={g.id} id={g.id} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry}>
                            <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
                            <Stop offset="35%" stopColor={colors[1]} stopOpacity="1" />
                            <Stop offset="65%" stopColor={colors[2]} stopOpacity="1" />
                            <Stop offset="100%" stopColor={colors[3]} stopOpacity="1" />
                        </RadialGradient>
                    ))}
                </Defs>
                 <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${radialGradients[0].id})`} />
                 <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${radialGradients[1].id})`} opacity="0.7" />
                 <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${radialGradients[2].id})`} opacity="0.5" />
                 <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${radialGradients[3].id})`} opacity="0.3" />
                 <Rect x="0" y="0" width="100%" height="100%" fill="#000" opacity="0.1" />
            </Svg> */}

            <BlurView intensity={2} style={StyleSheet.absoluteFill} />

            {/* The top-down pink gloss */}
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="grad-overlay" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#eb00d7" stopOpacity="0.1" />
                  <Stop offset="100%" stopColor="#eb00d7" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              {!pressed && (
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad-overlay)" />
              )}
            </Svg>

            {/* Layer 3: The Icon and Text, with zIndex: 3 to be on top of everything inside the mask. */}
            <View style={styles.iconTextContainer}>
                {icon && <FontAwesome name={icon} size={iconSize} color="white" />}
                {text && (
                  <Text
                    style={[
                      styles.buttonText,
                      { fontSize, marginTop: icon ? (textMarginTop !== undefined ? textMarginTop : 10) : 0 }
                    ]}
                  >
                    {text}
                  </Text>
                )}
            </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  button: {
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contentMask: {
    position: 'absolute',
    borderRadius: 19,
    overflow: 'hidden',
    zIndex: 2,
  },
  iconTextContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    flexDirection: 'column',
  },
  buttonText: {
    marginTop: 10,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default GlowingButton; 