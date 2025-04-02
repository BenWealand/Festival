import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [messages, setMessages] = useState(sampleMessages);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

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
    <TouchableOpacity 
      style={[styles.messageItem, item.unread && styles.unreadMessage]}
      onPress={() => handleMessagePress(item)}
    >
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.sender, item.unread && styles.unreadText]}>
            {item.sender}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.subject, item.unread && styles.unreadText]}>
          {item.subject}
        </Text>
        <Text style={styles.preview} numberOfLines={2}>
          {item.preview}
        </Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
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
        color={selectedCategory === item.id ? '#fff' : '#666'} 
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
      onRequestClose={() => setIsModalVisible(false)}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
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
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <View style={styles.container}>
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

      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
      />

      {renderMessageModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#2089dc',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  messagesList: {
    padding: 10,
  },
  messageItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unreadMessage: {
    backgroundColor: '#f8f9ff',
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
    color: '#333',
  },
  unreadText: {
    color: '#2089dc',
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  subject: {
    fontSize: 15,
    color: '#333',
    marginBottom: 5,
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2089dc',
    marginLeft: 10,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalSubject: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2089dc',
    marginBottom: 10,
  },
  modalTimestamp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  modalBody: {
    maxHeight: '80%',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
}); 