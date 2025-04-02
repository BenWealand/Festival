import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from './constants/theme';

// Import screens
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import BalanceScreen from './screens/BalanceScreen';
import InboxScreen from './screens/InboxScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

// App State for session refresh
import { AppState } from 'react-native';
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

const Drawer = createDrawerNavigator();

function MainNavigator() {
  return (
    <Drawer.Navigator 
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text.white,
        headerTitleStyle: {
          display: 'none',
        },
        drawerStyle: {
          width: 300,
          backgroundColor: COLORS.surface.primary,
        },
        drawerLabelStyle: {
          fontSize: 16,
          color: COLORS.text.white,
        },
        drawerItemStyle: {
          paddingVertical: 8,
        },
        drawerActiveTintColor: COLORS.text.white,
        drawerInactiveTintColor: COLORS.text.white,
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <TouchableOpacity 
              onPress={() => {
                console.log('Menu button pressed');
                try {
                  navigation.openDrawer();
                  console.log('Drawer opened successfully');
                } catch (error) {
                  console.error('Error opening drawer:', error);
                }
              }}
              style={styles.headerIconContainer}
            >
              <FontAwesome 
                name="bars" 
                size={24} 
                color={COLORS.text.white} 
              />
            </TouchableOpacity>
            <FontAwesome 
              name="home" 
              size={24} 
              color={COLORS.text.white} 
              style={styles.headerScreenIcon}
            />
          </View>
        ),
      })}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
          headerLeft: () => (
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity 
                onPress={() => navigation.openDrawer()}
                style={styles.headerIconContainer}
              >
                <FontAwesome name="bars" size={24} color={COLORS.text.white} />
              </TouchableOpacity>
              <FontAwesome name="user" size={24} color={COLORS.text.white} style={styles.headerScreenIcon} />
            </View>
          ),
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="cog" size={size} color={color} />
          ),
          headerLeft: () => (
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity 
                onPress={() => navigation.openDrawer()}
                style={styles.headerIconContainer}
              >
                <FontAwesome name="bars" size={24} color={COLORS.text.white} />
              </TouchableOpacity>
              <FontAwesome name="cog" size={24} color={COLORS.text.white} style={styles.headerScreenIcon} />
            </View>
          ),
        }}
      />
      <Drawer.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={({ navigation }) => ({
          title: 'Notification Settings',
          drawerItemStyle: { display: 'none' },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.headerIconContainer}
            >
              <FontAwesome name="arrow-left" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
          ),
        })}
      />
      <Drawer.Screen 
        name="Balance" 
        component={BalanceScreen}
        options={({ navigation }) => ({
          title: 'Balance',
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="money" size={size} color={color} />
          ),
          headerLeft: () => (
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity 
                onPress={() => navigation.openDrawer()}
                style={styles.headerIconContainer}
              >
                <FontAwesome name="bars" size={24} color={COLORS.text.white} />
              </TouchableOpacity>
              <FontAwesome name="money" size={24} color={COLORS.text.white} style={styles.headerScreenIcon} />
            </View>
          ),
        })}
      />
      <Drawer.Screen 
        name="Inbox" 
        component={InboxScreen}
        options={({ navigation }) => ({
          title: 'Inbox',
          drawerIcon: ({ color, size }) => (
            <FontAwesome name="envelope" size={size} color={color} />
          ),
          headerLeft: () => (
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity 
                onPress={() => navigation.openDrawer()}
                style={styles.headerIconContainer}
              >
                <FontAwesome name="bars" size={24} color={COLORS.text.white} />
              </TouchableOpacity>
              <FontAwesome name="envelope" size={24} color={COLORS.text.white} style={styles.headerScreenIcon} />
            </View>
          ),
        })}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {session ? <MainNavigator /> : <Auth />}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface.primary,
  },
  errorText: {
    color: COLORS.text.white,
    fontSize: 16,
    textAlign: 'center',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    padding: 8,
  },
  headerScreenIcon: {
    marginLeft: 8,
  },
});