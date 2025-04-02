import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const navigation = useNavigation();

  const handleHelpPress = () => {
    Alert.alert(
      "Help & Policies",
      "Choose an option:",
      [
        {
          text: "Terms of Service",
          onPress: () => Alert.alert("Terms of Service", "Terms of service content...")
        },
        {
          text: "Privacy Policy",
          onPress: () => Alert.alert("Privacy Policy", "Privacy policy content...")
        },
        {
          text: "Contact Support",
          onPress: () => Alert.alert("Contact Support", "Support contact information...")
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <View style={styles.settingLeft}>
            <FontAwesome name="bell" size={24} color={COLORS.primary} style={styles.icon} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={handleHelpPress}
        >
          <View style={styles.settingLeft}>
            <FontAwesome name="question-circle" size={24} color={COLORS.primary} style={styles.icon} />
            <Text style={styles.settingText}>Help & Policies</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#999" />
        </TouchableOpacity>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
    color: COLORS.primary,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text.white,
  },
}); 