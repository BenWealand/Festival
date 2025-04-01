import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDistance, setShowDistance] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            // Add your logout logic here
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  const renderSettingItem = ({ icon, title, description, value, onValueChange, type = 'switch' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon} size={24} color="#2089dc" style={styles.settingIcon} />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={value ? "#2089dc" : "#f4f3f4"}
        />
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.settingHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#2089dc" style={styles.settingIcon} />
              <Text style={styles.settingTitle}>Profile</Text>
            </View>
            <Text style={styles.settingDescription}>Update your profile information</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem({
          icon: "notifications-outline",
          title: "Push Notifications",
          description: "Receive updates about nearby events and festivals",
          value: notifications,
          onValueChange: setNotifications
        })}
        {renderSettingItem({
          icon: "moon-outline",
          title: "Dark Mode",
          description: "Switch between light and dark theme",
          value: darkMode,
          onValueChange: setDarkMode
        })}
        {renderSettingItem({
          icon: "language-outline",
          title: "Language",
          description: "Change app language",
          value: false,
          onValueChange: () => {},
          type: 'link'
        })}
        {renderSettingItem({
          icon: "time-outline",
          title: "Time Zone",
          description: "Set your local time zone",
          value: false,
          onValueChange: () => {},
          type: 'link'
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        {renderSettingItem({
          icon: "location-outline",
          title: "Location Tracking",
          description: "Allow the app to track your location",
          value: locationTracking,
          onValueChange: setLocationTracking
        })}
        {renderSettingItem({
          icon: "refresh-outline",
          title: "Auto-refresh Location",
          description: "Automatically update your location periodically",
          value: autoRefresh,
          onValueChange: setAutoRefresh
        })}
        {renderSettingItem({
          icon: "map-outline",
          title: "Show Distance",
          description: "Display distance to events and festivals",
          value: showDistance,
          onValueChange: setShowDistance
        })}
        {renderSettingItem({
          icon: "compass-outline",
          title: "Show Direction",
          description: "Display direction to events and festivals",
          value: true,
          onValueChange: () => {},
        })}
        {renderSettingItem({
          icon: "speedometer-outline",
          title: "Show Travel Time",
          description: "Display estimated travel time to events",
          value: true,
          onValueChange: () => {},
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content</Text>
        {renderSettingItem({
          icon: "filter-outline",
          title: "Content Filters",
          description: "Filter event content and categories",
          value: false,
          onValueChange: () => {},
          type: 'link'
        })}
        {renderSettingItem({
          icon: "eye-outline",
          title: "Show Mature Content",
          description: "Display events with mature content",
          value: false,
          onValueChange: () => {},
        })}
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 