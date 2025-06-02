import React, { useState, useEffect } from 'react';
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
import { COLORS } from '../constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

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
        <ActivityIndicator size="large" color={COLORS.text.white} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error) {
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {Object.entries(menuByCategory).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.menuItem}>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemPrice}>${(item.price / 100).toFixed(2)}</Text>
                </View>
                <View style={styles.menuItemActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <FontAwesome name="edit" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <FontAwesome name="trash" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      >
        <FontAwesome name="plus" size={24} color={COLORS.text.white} />
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={editingItem ? handleEditItem : handleAddItem}
              >
                <Text style={styles.buttonText}>
                  {editingItem ? 'Update' : 'Add'}
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
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
    backgroundColor: COLORS.surface.primary,
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
    backgroundColor: COLORS.surface.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
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
    borderRadius: 28,
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
    fontWeight: '600',
    color: COLORS.text.white,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.surface.primary,
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
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface.primary,
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