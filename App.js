import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { COLORS } from './constants/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import Auth from './components/Auth';
import { StatusBar } from 'expo-status-bar';

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
import MenuItemDetailScreen from './screens/MenuItemDetailScreen';
import LocationTransactionsScreen from './screens/LocationTransactionsScreen';
import GlobalTransactionsScreen from './screens/GlobalTransactionsScreen';
import ActiveOrdersScreen from './screens/ActiveOrdersScreen';
import ScrollableTabBar from './components/ScrollableTabBar';
import EmployeeTipsScreen from './screens/EmployeeTipsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const BUSINESS_TABS = [
  { name: 'Home', component: HomeScreen, icon: 'home', label: 'Home' },
  { name: 'BusinessMenu', component: BusinessMenuScreen, icon: 'cutlery', label: 'Menu' },
  { name: 'Customers', component: CustomersScreen, icon: 'users', label: 'Customers' },
  { name: 'ActiveOrders', component: ActiveOrdersScreen, icon: 'shopping-basket', label: 'Active Orders' },
  { name: 'Analytics', component: AnalyticsScreen, icon: 'bar-chart', label: 'Analytics' },
  { name: 'EmployeeTips', component: EmployeeTipsScreen, icon: 'money', label: 'Tips' },
  { name: 'Settings', component: SettingsScreen, icon: 'cog', label: 'Settings' },
];

const USER_TABS = [
  { name: 'Home', component: HomeScreen, icon: 'home', label: 'Home' },
  { name: 'Balance', component: BalanceScreen, icon: 'money', label: 'Balance' },
  { name: 'GlobalTransactions', component: GlobalTransactionsScreen, icon: 'exchange', label: 'Transactions' },
  { name: 'Settings', component: SettingsScreen, icon: 'cog', label: 'Settings' },
];

function MainTabs({ isOwner }) {
  const tabs = isOwner ? BUSINESS_TABS : USER_TABS;
  return (
    <Tab.Navigator
      tabBar={props => <ScrollableTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const tab = tabs.find(t => t.name === route.name);
          return tab ? (
            <FontAwesome name={tab.icon} size={size} color={color} />
          ) : null;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.white,
        tabBarStyle: {
          backgroundColor: COLORS.surface.card,
          borderTopWidth: 0,
          height: 70,
        },
        tabBarShowLabel: false,
      })}
    >
      {tabs.map(tab => (
        <Tab.Screen 
          key={tab.name} 
          name={tab.name}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name={`${tab.name}Main`} component={tab.component} />
              {tab.name === 'Home' && (
                <>
                  <Stack.Screen name="LocationMenu" component={LocationMenuScreen} />
                  <Stack.Screen name="LocationTransactions" component={LocationTransactionsScreen} />
                  <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
                </>
              )}
            </Stack.Navigator>
          )}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = React.useState(null); // null = loading, true/false = loaded
  const [ownerLoading, setOwnerLoading] = React.useState(true);

  React.useEffect(() => {
    const checkOwner = async () => {
      if (!user?.id) {
        setIsOwner(false);
        setOwnerLoading(false);
        return;
      }
      try {
        const { data: ownedLocation, error: ownerError } = await supabase
          .from('locations')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        setIsOwner(!!ownedLocation);
      } catch (e) {
        setIsOwner(false);
      } finally {
        setOwnerLoading(false);
      }
    };
    checkOwner();
  }, [user]);

  if (authLoading || ownerLoading || isOwner === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // DEBUG: Log TAB_SCREENS and check for misconfigurations
  console.log('TAB_SCREENS:', BUSINESS_TABS.concat(USER_TABS));
  BUSINESS_TABS.concat(USER_TABS).forEach(tab => {
    if (!tab.name || !tab.component) {
      console.error('Tab misconfiguration:', tab);
    }
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={COLORS.surface.primary} translucent={false} />
      <StripeProvider
        publishableKey={Constants.expoConfig.extra.stripePubKey}
        merchantIdentifier="merchant.com.benwealand.myapp"
        urlScheme="myapp"
      >
        <NavigationContainer>
          {!user ? (
            <Auth />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs">
                {() => <MainTabs isOwner={isOwner} />}
              </Stack.Screen>
              <Stack.Screen name="LocationMenu" component={LocationMenuScreen} />
              <Stack.Screen name="LocationTransactions" component={LocationTransactionsScreen} />
              <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Inbox" component={InboxScreen} />
              <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </StripeProvider>
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
});