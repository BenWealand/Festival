import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, BACKGROUND_BASE } from '../constants/theme';
import { GLASS_GRADIENT_COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

// Sample data - replace with actual data from your backend
const sampleMessages = [
  {
    id: '1',
    sender: 'Festival Team',
    subject: 'Welcome to Festival!',
    preview: 'Thank you for joining Festival. We\'re excited to have you on board...',
    timestamp: '2024-03-20T10:30:00',
    unread: true,
    category: 'system'
  },
  {
    id: '2',
    sender: 'Event Organizer',
    subject: 'Your Event Details',
    preview: 'Your upcoming event has been confirmed. Here are the details...',
    timestamp: '2024-03-19T15:45:00',
    unread: false,
    category: 'event'
  },
  {
    id: '3',
    sender: 'Support Team',
    subject: 'Account Verification',
    preview: 'Please verify your account to access all features...',
    timestamp: '2024-03-18T09:15:00',
    unread: true,
    category: 'support'
  },
  {
    id: '4',
    sender: 'Festival Rewards',
    subject: 'Special Offer: 50% Off Your Next Event!',
    preview: 'Limited time offer! Get 50% off your next event ticket...',
    timestamp: '2024-03-20T14:20:00',
    unread: true,
    category: 'promotion'
  },
  {
    id: '5',
    sender: 'Festival VIP',
    subject: 'Exclusive VIP Access Available',
    preview: 'Upgrade to VIP status and enjoy premium benefits...',
    timestamp: '2024-03-19T11:00:00',
    unread: false,
    category: 'promotion'
  }
];

const categories = [
  { id: 'all', label: 'All', icon: 'envelope' },
  { id: 'unread', label: 'Unread', icon: 'envelope-o' },
  { id: 'promotion', label: 'Promotions', icon: 'gift' },
  { id: 'event', label: 'Events', icon: 'calendar' },
  { id: 'system', label: 'System', icon: 'cog' },
  { id: 'support', label: 'Support', icon: 'question-circle' },
];

export default function InboxScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [messages, setMessages] = useState(sampleMessages);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // If less than 24 hours ago
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // If less than 7 days ago
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    // Otherwise show the date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredMessages = messages.filter(message => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unread') return message.unread;
    return message.category === selectedCategory;
  });

  const handleMessagePress = (message) => {
    setSelectedMessage(message);
    setIsModalVisible(true);
    // Mark message as read
    setMessages(messages.map(msg => 
      msg.id === message.id ? { ...msg, unread: false } : msg
    ));
  };

  const renderMessage = ({ item }) => (
    <GlassCard style={{ marginBottom: 10 }} borderRadius={16}>
      <TouchableOpacity 
        style={[item.unread && styles.unreadMessage]}
        onPress={() => handleMessagePress(item)}
      >
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={[styles.sender, item.unread && styles.unreadText]}>
              {item.sender}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
              {item.unread && <View style={styles.unreadDot} />}
            </View>
          </View>
          <Text style={[styles.subject, item.unread && styles.unreadText]}>
            {item.subject}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.preview}
          </Text>
        </View>
      </TouchableOpacity>
    </GlassCard>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.selectedCategory
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <FontAwesome 
        name={item.icon} 
        size={20} 
        color={selectedCategory === item.id ? '#fff' : COLORS.primary} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.selectedCategoryText
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderMessageModal = () => (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={{
          position: 'absolute',
          width: '90%',
          maxHeight: '80%',
          backgroundColor: BACKGROUND_BASE,
          borderRadius: 18,
          zIndex: 0,
        }} />
        <GlassCard style={styles.modalContent} borderRadius={18}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalSender}>{selectedMessage?.sender}</Text>
            <TouchableOpacity 
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <FontAwesome name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubject}>{selectedMessage?.subject}</Text>
          <Text style={styles.modalTimestamp}>
            {selectedMessage && formatTimestamp(selectedMessage.timestamp)}
          </Text>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalText}>
              {selectedMessage?.preview}
              {'\n\n'}
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              {'\n\n'}
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </Text>
          </ScrollView>
        </GlassCard>
      </View>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
    </Modal>
  );

  // GradientTopBar component for the top section
  const GradientTopBar = ({ children, style }) => {
    // Use the same color order as GlassCard, but fixed order for consistency
    const colorOrder = [
      GLASS_GRADIENT_COLORS.primary,
      GLASS_GRADIENT_COLORS.secondary,
      GLASS_GRADIENT_COLORS.tertiary,
    ];
    return (
      <View style={[{ width: '100%', overflow: 'hidden', paddingVertical: 10 }, style]}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="topbar-linear" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colorOrder[0]} stopOpacity={0.7} />
              <Stop offset="50%" stopColor={colorOrder[1]} stopOpacity={0.7} />
              <Stop offset="100%" stopColor={colorOrder[2]} stopOpacity={0.7} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#topbar-linear)" />
        </Svg>
        <View style={{ position: 'relative', zIndex: 1 }}>{children}</View>
      </View>
    );
  };

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <View style={{ position: 'relative', flex: 1 }}>
          {/* GradientTopBar absolutely fills the top, behind header, tabs, and glass cards */}
          <GradientTopBar style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 186, zIndex: 0 }}>
            {/* Empty, gradient only */}
          </GradientTopBar>
          {/* Custom Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 36, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: 'transparent', zIndex: 1, marginTop: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
              <FontAwesome name="arrow-left" size={26} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={{ color: COLORS.text.white, fontSize: 22, fontWeight: 'bold', flex: 1 }}>Inbox</Text>
          </View>
          <View style={[styles.container, { zIndex: 1 }]}> 
            {/* Tabs on top of gradient */}
            <View>
              <View style={styles.categoriesContainer}>
                <FlatList
                  horizontal
                  data={categories}
                  renderItem={renderCategory}
                  keyExtractor={item => item.id}
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesList}
                />
              </View>
            </View>
            <FlatList
              data={filteredMessages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.messagesList, { marginTop: 18 }]}
            />
            {renderMessageModal()}
          </View>
        </View>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  categoriesContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  categoriesList: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: BACKGROUND_BASE,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text.white,
  },
  selectedCategoryText: {
    color: COLORS.text.white,
  },
  messagesList: {
    padding: 10,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 0,
    borderRadius: 0,
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  unreadMessage: {
    backgroundColor: 'transparent',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sender: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  unreadText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.7,
  },
  subject: {
    fontSize: 15,
    color: COLORS.text.white,
    marginBottom: 5,
  },
  preview: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.7,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    marginTop: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalSender: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  closeButton: {
    padding: 5,
  },
  modalSubject: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.white,
    marginBottom: 10,
  },
  modalTimestamp: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.7,
    marginBottom: 15,
  },
  modalBody: {
    maxHeight: '80%',
  },
  modalText: {
    fontSize: 16,
    color: COLORS.text.white,
    lineHeight: 24,
  },
}); 