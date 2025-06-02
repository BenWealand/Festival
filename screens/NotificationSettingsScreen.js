import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function NotificationSettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  const handleMainToggle = (value) => {
    setNotifications(value);
    if (!value) {
      setPushNotifications(false);
      setSmsNotifications(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        {/* Main Notifications Toggle */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Enable Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={handleMainToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notifications ? '#2089dc' : '#f4f3f4'}
          />
        </View>

        {/* Push Notifications */}
        <View style={[styles.settingItem, !notifications && styles.disabledItem]}>
          <Text style={[styles.settingText, !notifications && styles.disabledText]}>
            Push Notifications
          </Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={pushNotifications ? '#2089dc' : '#f4f3f4'}
            disabled={!notifications}
          />
        </View>

        {/* SMS Notifications */}
        <View style={[styles.settingItem, !notifications && styles.disabledItem]}>
          <Text style={[styles.settingText, !notifications && styles.disabledText]}>
            SMS Notifications
          </Text>
          <Switch
            value={smsNotifications}
            onValueChange={setSmsNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={smsNotifications ? '#2089dc' : '#f4f3f4'}
            disabled={!notifications}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  section: {
    backgroundColor: COLORS.surface.card,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
    paddingVertical: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text.white,
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.text.white,
    opacity: 0.5,
  },
}); 