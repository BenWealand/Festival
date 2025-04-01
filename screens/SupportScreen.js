import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen() {
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@festivalapp.com');
  };

  const handleVisitWebsite = () => {
    Linking.openURL('https://festivalapp.com/support');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://festivalapp.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://festivalapp.com/terms');
  };

  const renderSupportItem = ({ icon, title, description, onPress }) => (
    <TouchableOpacity style={styles.supportItem} onPress={onPress}>
      <View style={styles.supportInfo}>
        <View style={styles.supportHeader}>
          <Ionicons name={icon} size={24} color="#2089dc" style={styles.supportIcon} />
          <Text style={styles.supportTitle}>{title}</Text>
        </View>
        {description && <Text style={styles.supportDescription}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help Center</Text>
        {renderSupportItem({
          icon: "mail-outline",
          title: "Contact Support",
          description: "Get in touch with our support team",
          onPress: handleEmailSupport
        })}
        {renderSupportItem({
          icon: "globe-outline",
          title: "Visit Help Center",
          description: "Browse our online help documentation",
          onPress: handleVisitWebsite
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        {renderSupportItem({
          icon: "shield-checkmark-outline",
          title: "Privacy Policy",
          description: "Learn how we handle your data",
          onPress: handlePrivacyPolicy
        })}
        {renderSupportItem({
          icon: "document-text-outline",
          title: "Terms of Service",
          description: "Read our terms and conditions",
          onPress: handleTermsOfService
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.appName}>Festival App</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2024 Festival App. All rights reserved.</Text>
        </View>
      </View>
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
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  supportInfo: {
    flex: 1,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIcon: {
    marginRight: 12,
  },
  supportTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  supportDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  aboutContainer: {
    padding: 16,
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
}); 