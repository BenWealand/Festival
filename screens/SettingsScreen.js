import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <View style={styles.container}>
      <View style={styles.section}>
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
      </View>

      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>
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
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text.white,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: COLORS.text.white,
    backgroundColor: COLORS.surface.secondary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.surface.secondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  requirementsContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
  },
  requirementText: {
    color: COLORS.text.muted,
    fontSize: 14,
    marginVertical: 2,
  },
  requirementMet: {
    color: COLORS.success,
  },
}); 