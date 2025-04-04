import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { COLORS } from './constants/theme';
import { AuthProvider } from './context/AuthContext';
import CustomDrawer from './components/CustomDrawer';
import Auth from './components/Auth';

import Animated from 'react-native-reanimated';

console.log("👀 Reanimated:", Animated);


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
const Stack = createStackNavigator();

// Helper function to get the appropriate icon for each screen
const getScreenIcon = (routeName) => {
  switch (routeName) {
    case 'Home':
      return 'home';
    case 'Profile':
      return 'user';
    case 'Settings':
      return 'cog';
    case 'Balance':
      return 'money';
    case 'Inbox':
      return 'envelope';
    case 'NotificationSettings':
      return 'bell';
    default:
      return 'circle';
  }
};

// Web Navigation
function WebNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: COLORS.surface.primary,
        },
        headerTintColor: COLORS.text.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.headerIconContainer}
            >
              <FontAwesome 
                name={getScreenIcon(route.name)} 
                size={24} 
                color={COLORS.text.white} 
              />
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Balance" component={BalanceScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
        }}
      />
    </Stack.Navigator>
  );
}

// Mobile Navigation
function MobileNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: COLORS.surface.primary,
        },
        headerTintColor: COLORS.text.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
              <FontAwesome name="bars" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
            <FontAwesome 
              name={getScreenIcon(route.name)} 
              size={24} 
              color={COLORS.text.white} 
              style={{ marginLeft: 15 }}
            />
          </View>
        ),
        drawerStyle: {
          backgroundColor: COLORS.surface.primary,
          width: 240,
        },
        drawerActiveTintColor: COLORS.text.white,
        drawerInactiveTintColor: COLORS.text.muted,
      })}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          drawerIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color }) => (
            <FontAwesome name="cog" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Balance" 
        component={BalanceScreen}
        options={{
          title: 'Balance',
          drawerIcon: ({ color }) => (
            <FontAwesome name="money" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Inbox" 
        component={InboxScreen}
        options={{
          title: 'Inbox',
          drawerIcon: ({ color }) => (
            <FontAwesome name="envelope" size={24} color={color} />
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
              onPress={() => navigation.navigate('Settings')}
              style={styles.headerIconContainer}
            >
              <FontAwesome name="arrow-left" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
          ),
        })}
      />
    </Drawer.Navigator>
  );
}

// Main Navigator that switches between web and mobile
function MainNavigator() {
  if (Platform.OS === 'web') {
    return <WebNavigator />;
  }
  return <MobileNavigator />;
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
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <NavigationContainer>
          {session ? <MainNavigator /> : <Auth />}
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    marginLeft: 15,
  },
  headerIconContainer: {
    padding: 8,
  },
  headerScreenIcon: {
    marginLeft: 8,
  },
});