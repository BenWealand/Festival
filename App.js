import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import * as Font from 'expo-font';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import BalanceScreen from './screens/BalanceScreen';
import InboxScreen from './screens/InboxScreen';
import ProfileScreen from './screens/ProfileScreen';

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
          backgroundColor: '#2089dc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          display: 'none',
        },
        drawerStyle: {
          width: 300,
        },
        drawerLabelStyle: {
          fontSize: 16,
        },
        drawerItemStyle: {
          paddingVertical: 8,
        },
        drawerActiveTintColor: '#2089dc',
        drawerInactiveTintColor: '#333',
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
                color="#fff" 
              />
            </TouchableOpacity>
            <FontAwesome 
              name="home" 
              size={24} 
              color="#fff" 
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
        options={({ navigation }) => ({
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
                <FontAwesome name="bars" size={24} color="#fff" />
              </TouchableOpacity>
              <FontAwesome name="user" size={24} color="#fff" style={styles.headerScreenIcon} />
            </View>
          ),
        })}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
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
                <FontAwesome name="bars" size={24} color="#fff" />
              </TouchableOpacity>
              <FontAwesome name="cog" size={24} color="#fff" style={styles.headerScreenIcon} />
            </View>
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
                <FontAwesome name="bars" size={24} color="#fff" />
              </TouchableOpacity>
              <FontAwesome name="money" size={24} color="#fff" style={styles.headerScreenIcon} />
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
                <FontAwesome name="bars" size={24} color="#fff" />
              </TouchableOpacity>
              <FontAwesome name="envelope" size={24} color="#fff" style={styles.headerScreenIcon} />
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
  const [error, setError] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...FontAwesome.font,
        });
        setFontsLoaded(true);
      } catch (e) {
        console.error('Error loading fonts:', e);
        setError(e.message);
      }
    }

    async function initializeApp() {
      try {
        // Get initial session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
        }
        setSession(data?.session);
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('Auth state changed:', _event, session ? 'session exists' : 'no session');
          setSession(session);
          setLoading(false);
        });

        return () => subscription.unsubscribe();
      } catch (e) {
        console.error('Initialization error:', e);
        setError(e.message || 'An unknown error occurred');
        setLoading(false);
      }
    }

    Promise.all([loadFonts(), initializeApp()]);
  }, []);

  if (loading || !fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={36} color="#2089dc" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {session && session.user ? (
          <MainNavigator />
        ) : (
          <Auth />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
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