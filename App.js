import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform, Linking } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { COLORS } from './constants/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import CustomDrawer from './components/CustomDrawer';
import Auth from './components/Auth';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

import Animated from 'react-native-reanimated';

console.log("👀 Reanimated:", Animated);

// Import screens
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import BalanceScreen from './screens/BalanceScreen';
import InboxScreen from './screens/InboxScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import StripeOnboardingScreen from './screens/StripeOnboardingScreen';
import BusinessStripeConnectScreen from './screens/BusinessStripeConnectScreen';
import SuccessScreen from './screens/SuccessScreen';
import FailureScreen from './screens/FailureScreen';
import LocationMenuScreen from './screens/LocationMenuScreen';
import BusinessMenuScreen from './screens/BusinessMenuScreen';
import TransactionRatingScreen from './screens/TransactionRatingScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import CustomersScreen from './screens/CustomersScreen';
import CustomerDetailsScreen from './screens/CustomerDetailsScreen';

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

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={Auth} />
    </Stack.Navigator>
  );
}

// Main App Stack
function MainStack() {
  return Platform.OS === 'web' ? <WebNavigator /> : <MobileNavigator />;
}

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
      <Stack.Screen 
        name="StripeOnboarding" 
        component={StripeOnboardingScreen}
        options={{
          title: 'Stripe Onboarding',
        }}
      />
      <Stack.Screen 
        name="BusinessStripeConnect" 
        component={BusinessStripeConnectScreen}
        options={{
          title: 'Connect with Stripe',
        }}
      />
      <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
      <Stack.Screen name="FailureScreen" component={FailureScreen} />
    </Stack.Navigator>
  );
}

// Mobile Navigation
function MobileNavigator() {
  const [isOwner, setIsOwner] = useState(false);
  const [ownedLocationId, setOwnedLocationId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkOwnership = async () => {
      if (user) {
        const { data: locations, error } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (locations) {
          setIsOwner(true);
          setOwnedLocationId(locations.id);
        }
      }
    };

    checkOwnership();
  }, [user]);

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
      })}
    >
      <Stack.Screen 
        name="DrawerHome" 
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CustomerDetails" 
        component={CustomerDetailsScreen}
        options={{
          title: 'Customer Details',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="TransactionRating" 
        component={TransactionRatingScreen}
        options={{
          title: 'Rate Transaction',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

function DrawerNavigator() {
  const [isOwner, setIsOwner] = useState(false);
  const [ownedLocationId, setOwnedLocationId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkOwnership = async () => {
      if (user) {
        const { data: locations, error } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (locations) {
          setIsOwner(true);
          setOwnedLocationId(locations.id);
        }
      }
    };

    checkOwnership();
  }, [user]);

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
        name="LocationMenu" 
        component={LocationMenuScreen}
        options={{
          title: 'Menu',
          drawerItemStyle: { display: 'none' },
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
      {!isOwner && (
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
      )}
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
      {isOwner && ownedLocationId && (
        <Drawer.Screen 
          name="BusinessStripeConnectScreen" 
          component={BusinessStripeConnectScreen}
          initialParams={{ locationId: ownedLocationId }}
          options={{
            title: 'Connect with Stripe',
            drawerIcon: ({ color }) => (
              <FontAwesome name="credit-card" size={24} color={color} />
            ),
          }}
        />
      )}
      {isOwner && (
        <Drawer.Screen 
          name="BusinessMenu" 
          component={BusinessMenuScreen}
          options={{
            title: 'Manage Menu',
            drawerIcon: ({ color }) => (
              <FontAwesome name="cutlery" size={24} color={color} />
            ),
          }}
        />
      )}
      {isOwner && (
        <Drawer.Screen 
          name="Analytics" 
          component={AnalyticsScreen}
          options={{
            title: 'Analytics',
            drawerIcon: ({ color }) => (
              <FontAwesome name="bar-chart" size={24} color={color} />
            ),
          }}
        />
      )}
      {isOwner && (
        <Drawer.Screen 
          name="Customers" 
          component={CustomersScreen}
          options={{
            title: 'Customers',
            drawerIcon: ({ color }) => (
              <FontAwesome name="users" size={24} color={color} />
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
}

// Root Stack Navigator to always provide SuccessScreen and FailureScreen
function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainStack} />
      <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
      <Stack.Screen name="FailureScreen" component={FailureScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = React.useRef();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset navigation when auth state changes
      if (!session && navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      if (url.includes('stripe-connect-success')) {
        navigationRef.current?.navigate('SuccessScreen');
      } else if (url.includes('stripe-connect-failure')) {
        navigationRef.current?.navigate('FailureScreen');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StripeProvider
          publishableKey={Constants.expoConfig.extra.stripePubKey}
          merchantIdentifier="merchant.com.benwealand.myapp"
          urlScheme="myapp"
        >
          <NavigationContainer ref={navigationRef}>
            {session ? <RootStack /> : <AuthStack />}
          </NavigationContainer>
        </StripeProvider>
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