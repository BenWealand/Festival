import React from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function ScrollableTabBar({ state, descriptors, navigation }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#222', height: 70 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          let iconName = null;
          if (options.tabBarIcon) {
            // Use the same color logic as your tabBar
            iconName = options.tabBarIcon({ color: isFocused ? COLORS.primary : '#fff', size: 24 });
          }

          if (options.tabBarButton && options.tabBarButton() === null) {
            // Hide hidden tabs
            return null;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
                height: 70,
              }}
            >
              {iconName}
              <Text style={{ color: isFocused ? COLORS.primary : '#fff', fontSize: 12, marginTop: 2 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
} 