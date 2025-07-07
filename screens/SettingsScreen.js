import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const radialGradients = useMemo(() => [
    { id: 'settings-bg-1', cx: '30%', cy: '30%', rx: '60%', ry: '60%' },
    { id: 'settings-bg-2', cx: '70%', cy: '70%', rx: '70%', ry: '70%' },
  ], []);

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasMinLength = password.length >= 6;
    return hasUpperCase && hasMinLength;
  };

  const getPasswordRequirements = () => {
    return {
      length: newPassword.length >= 6,
      uppercase: /[A-Z]/.test(newPassword)
    };
  };

  const renderPasswordRequirements = () => {
    const requirements = getPasswordRequirements();
    return (
      <View style={styles.requirementsContainer}>
        <Text style={[styles.requirementText, requirements.length && styles.requirementMet]}>
          • At least 6 characters
        </Text>
        <Text style={[styles.requirementText, requirements.uppercase && styles.requirementMet]}>
          • At least one uppercase letter
        </Text>
      </View>
    );
  };

  const handleChangePassword = async () => {
    if (!validatePassword(newPassword)) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long and contain at least one uppercase letter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully!');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Sign out after password change
      await supabase.auth.signOut();
      // Navigation will be handled by the parent component through the session state
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

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
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Svg
        height={contentHeight > 0 ? contentHeight : '100%'}
        width="100%"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}
      >
        <Defs>
          {radialGradients.map(g => (
            <RadialGradient key={g.id} id={g.id} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry}>
              <Stop offset="0%" stopColor={COLORS.backgroundRadial || '#3B006A'} stopOpacity="0.55" />
              <Stop offset="100%" stopColor={COLORS.backgroundRadial || '#3B006A'} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x="0" y="0" width="100%" height={contentHeight > 0 ? contentHeight : '100%'} fill={COLORS.background || '#1a003d'} />
        {radialGradients.map(g => (
          <Rect key={g.id} x="0" y="0" width="100%" height={contentHeight > 0 ? contentHeight : '100%'} fill={`url(#${g.id})`} />
        ))}
      </Svg>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <ScrollView style={{ flex: 1 }} onContentSizeChange={(w, h) => setContentHeight(h)}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          
          <View style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
            <GlassCard style={styles.section} borderRadius={16}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => navigation.navigate('NotificationSettings')}
              >
                <View style={styles.settingLeft}>
                  <FontAwesome name="bell" size={24} color={COLORS.text.white} style={styles.icon} />
                  <Text style={styles.settingText}>Notifications</Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color={COLORS.text.white} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setShowChangePassword(true)}
              >
                <View style={styles.settingLeft}>
                  <FontAwesome name="lock" size={24} color={COLORS.text.white} style={styles.icon} />
                  <Text style={styles.settingText}>Change Password</Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color={COLORS.text.white} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleHelpPress}
              >
                <View style={styles.settingLeft}>
                  <FontAwesome name="question-circle" size={24} color={COLORS.text.white} style={styles.icon} />
                  <Text style={styles.settingText}>Help & Policies</Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color={COLORS.text.white} />
              </TouchableOpacity>
            </GlassCard>

            <GlassCard style={styles.section} borderRadius={16}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <GlowingButton
                  text="Profile"
                  icon="user"
                  onPress={() => navigation.navigate('Profile')}
                  buttonWidth={150}
                  buttonHeight={120}
                  style={{ margin: 8 }}
                />
                <GlowingButton
                  text="Inbox"
                  icon="envelope"
                  onPress={() => navigation.navigate('Inbox')}
                  buttonWidth={150}
                  buttonHeight={120}
                  style={{ margin: 8 }}
                />
              </View>
            </GlassCard>
          </View>

          <Modal
            visible={showChangePassword}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowChangePassword(false)}
          >
            <View style={styles.modalContainer}>
              <GlassCard style={styles.modalContent} borderRadius={16}>
                <Text style={styles.modalTitle}>Change Password</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Current Password"
                  placeholderTextColor="#666"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                />

                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#666"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />

                {renderPasswordRequirements()}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowChangePassword(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleChangePassword}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Updating...' : 'Update Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text.white,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: COLORS.text.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  requirementsContainer: {
    marginBottom: 24,
  },
  requirementText: {
    color: COLORS.text.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  requirementMet: {
    color: COLORS.success,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text.white,
    fontWeight: '600',
    fontSize: 16,
  },
}); 