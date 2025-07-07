import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// The visual component for the meteor streak
const Meteor = ({ animatedStyle }) => {
  return (
    <Animated.View style={[styles.meteorContainer, animatedStyle]}>
      {/* Outer pink glow layer */}
      <LinearGradient
        colors={[COLORS.primary, 'rgba(239, 138, 215, 0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.meteor, styles.outerGlow]}
      />
      {/* Inner pink glow layer */}
      <LinearGradient
        colors={[COLORS.primary, 'rgba(239, 138, 215, 0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.meteor, styles.glowMeteor]}
      />
      {/* White meteor layer */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.meteor}
      />
    </Animated.View>
  );
};

const MeteorBackground = () => {
  // Shared values for animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue('0deg');
  const isAnimating = useSharedValue(false);

  // The main animation function
  const triggerMeteor = () => {
    if (isAnimating.value) return; // Don't start if already animating
    
    isAnimating.value = true;
    
    // 1. Define random start and end points off-screen
    const startX = -300; // Start off the left edge
    const startY = Math.random() * screenHeight;
    const endX = screenWidth + 300; // End off the right edge
    const endY = Math.random() * screenHeight;

    // 2. Calculate the angle for rotation
    const angle = Math.atan2(endY - startY, endX - startX);
    rotate.value = `${angle}rad`;

    // 3. Set the initial position
    translateX.value = startX;
    translateY.value = startY;

    // 4. Define duration
    const duration = Math.random() * 1000 + 2000; // 2.0 to 3.0 seconds

    // 5. Run the animation sequence
    opacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(1, { duration: duration - 100 }),
      withTiming(0, { duration: 50 }, () => {
        isAnimating.value = false;
      })
    );

    translateX.value = withTiming(endX, { duration, easing: Easing.linear });
    translateY.value = withTiming(endY, { duration, easing: Easing.linear });
  };
  
  // A function to loop the animation with a random delay
  const scheduleNextMeteor = () => {
    // Random delay between 8 and 15 seconds
    const delay = Math.random() * 7000 + 8000;
    setTimeout(() => {
      runOnJS(triggerMeteor)();
      runOnJS(scheduleNextMeteor)();
    }, delay);
  };
  
  // Start the animation loop when the component mounts
  useEffect(() => {
    // Schedule the meteors (no immediate start)
    scheduleNextMeteor();
  }, []);

  // Connect shared values to animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: rotate.value },
      ],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Meteor animatedStyle={animatedStyle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  meteorContainer: {
    position: 'absolute',
  },
  meteor: {
    width: 300,
    height: 2,
    borderRadius: 2,
  },
  glowMeteor: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 304,
    height: 6,
    borderRadius: 4,
    opacity: 0.6,
  },
  outerGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 310,
    height: 12,
    borderRadius: 6,
    opacity: 0.4,
  },
});

export default MeteorBackground; 