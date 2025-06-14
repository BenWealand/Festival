import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const TABS = [
  { name: 'Home', icon: 'home', label: 'Home' },
  { name: 'LocationMenu', icon: 'cutlery', label: 'Menu' },
  { name: 'Profile', icon: 'user', label: 'Profile' },
  { name: 'Settings', icon: 'cog', label: 'Settings' },
  { name: 'Balance', icon: 'money', label: 'Balance' },
  { name: 'Inbox', icon: 'envelope', label: 'Inbox' },
  { name: 'NotificationSettings', icon: 'bell', label: 'Notifications' },
  { name: 'StripeOnboarding', icon: 'credit-card', label: 'Stripe' },
  { name: 'BusinessStripeConnect', icon: 'credit-card', label: 'Connect' },
  { name: 'SuccessScreen', icon: 'check', label: 'Success' },
  { name: 'FailureScreen', icon: 'close', label: 'Failure' },
  { name: 'BusinessMenu', icon: 'cutlery', label: 'Manage Menu' },
  { name: 'TransactionRating', icon: 'star', label: 'Rate' },
  { name: 'Analytics', icon: 'bar-chart', label: 'Analytics' },
  { name: 'Customers', icon: 'users', label: 'Customers' },
  { name: 'CustomerDetails', icon: 'user', label: 'Customer' },
  { name: 'MenuItemDetail', icon: 'info-circle', label: 'Item' },
  { name: 'LocationTransactions', icon: 'history', label: 'Transactions' },
  { name: 'GlobalTransactions', icon: 'history', label: 'All Txns' },
  { name: 'ActiveOrders', icon: 'shopping-basket', label: 'Orders' },
];

export default function BottomNavBar({ currentScreen, setCurrentScreen }) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => setCurrentScreen(tab.name)}
          >
            <FontAwesome
              name={tab.icon}
              size={26}
              color={currentScreen === tab.name ? COLORS.primary : COLORS.text.white}
            />
            <Text style={[styles.label, currentScreen === tab.name && { color: COLORS.primary, fontWeight: 'bold' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface.card,
    height: 70,
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    color: COLORS.text.white,
    fontSize: 13,
    marginTop: 2,
  },
}); 