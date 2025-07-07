import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { YOUR_BACKEND_API_URL } from '@env';
import GlassCard from '../components/GlassCard';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlowingButton from '../components/GlowingButton';
import BackgroundGradient from '../components/BackgroundGradient';
import MeteorBackground from '../components/MeteorBackground';

export default function BusinessMenuScreen() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [locationId, setLocationId] = useState(null);
  const [contentHeight, setContentHeight] = useState(0);
  const radialGradients = useMemo(() => [
    {
      id: 'menu-bg-radial-1',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '60%',
      ry: '60%',
    },
    {
      id: 'menu-bg-radial-2',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '70%',
      ry: '70%',
    },
  ], []);

  useEffect(() => {
    fetchLocationAndMenu();
  }, []);

  const fetchLocationAndMenu = async () => {
    try {
      setLoading(true);
      
      // First get the location ID for this owner
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (locationError) throw locationError;
      setLocationId(location.id);

      // Then fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('location_id', location.id)
        .order('category', { ascending: true });

      if (menuError) throw menuError;
      setMenuItems(menuData || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!name || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const priceInCents = Math.round(parseFloat(price) * 100);
      
      const { data, error } = await supabase
        .from('menu_items')
        .insert([
          {
            location_id: locationId,
            name,
            description,
            price: priceInCents,
            category
          }
        ])
        .select();

      if (error) throw error;

      setMenuItems([...menuItems, data[0]]);
      resetForm();
      setShowAddModal(false);
      Alert.alert('Success', 'Menu item added successfully');
    } catch (err) {
      console.error('Error adding menu item:', err);
      Alert.alert('Error', 'Failed to add menu item');
    }
  };

  const handleEditItem = async () => {
    if (!name || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const priceInCents = Math.round(parseFloat(price) * 100);
      
      const { error } = await supabase
        .from('menu_items')
        .update({
          name,
          description,
          price: priceInCents,
          category
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      // Update local state
      setMenuItems(menuItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, name, description, price: priceInCents, category }
          : item
      ));

      resetForm();
      setShowAddModal(false);
      Alert.alert('Success', 'Menu item updated successfully');
    } catch (err) {
      console.error('Error updating menu item:', err);
      Alert.alert('Error', 'Failed to update menu item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              setMenuItems(menuItems.filter(item => item.id !== itemId));
              Alert.alert('Success', 'Menu item deleted successfully');
            } catch (err) {
              console.error('Error deleting menu item:', err);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setEditingItem(null);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setPrice((item.price / 100).toString());
    setCategory(item.category);
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error) {
    // If the error is due to no location for owner, show a relevant message
    if (error === 'Failed to load menu' && user?.id) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No business location found for your account. Please contact support.</Text>
        </View>
      );
    }
    // Otherwise, show the error
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <BackgroundGradient>
      <MeteorBackground />
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="light" backgroundColor="transparent" translucent={true} />
          <ScrollView
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {Object.entries(menuByCategory).map(([category, items]) => (
              <GlassCard key={category} style={{ marginBottom: 24, paddingVertical: 12, paddingHorizontal: 20 }} borderRadius={16}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={{ marginTop: 8 }}>
                  {items.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: BACKGROUND_BASE,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>{item.name}</Text>
                        <Text style={{ color: '#BBB', fontSize: 13, marginBottom: 2 }}>{item.description}</Text>
                        <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 15 }}>${(item.price / 100).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                          <FontAwesome name="edit" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteItem(item.id)}>
                          <FontAwesome name="trash" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ))}
          </ScrollView>
          <GlowingButton
            icon="plus"
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            buttonWidth={80}
            buttonHeight={80}
            style={{ position: 'absolute', right: 24, bottom: 32, borderRadius: 40, zIndex: 10, padding: 0 }}
          />
          <Modal
            visible={showAddModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalContainer}>
              <GlassCard style={styles.modalContent} borderRadius={16}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={COLORS.text.muted}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  placeholderTextColor={COLORS.text.muted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Price (e.g., 9.99)"
                  placeholderTextColor={COLORS.text.muted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Category"
                  placeholderTextColor={COLORS.text.muted}
                  value={category}
                  onChangeText={setCategory}
                />
                <View style={styles.modalButtons}>
                  <GlowingButton
                    text="Cancel"
                    onPress={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    buttonWidth={120}
                    buttonHeight={48}
                    style={{ marginRight: 8 }}
                  />
                  <GlowingButton
                    text={editingItem ? 'Update' : 'Add'}
                    onPress={editingItem ? handleEditItem : handleAddItem}
                    buttonWidth={120}
                    buttonHeight={48}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </GlassCard>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_BASE,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: BACKGROUND_BASE,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
  },
  categorySection: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.white,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  menuItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(30,0,50,0.92)',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(30,0,50,0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: COLORS.text.white,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(30,0,50,0.7)',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 