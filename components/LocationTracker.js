import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

export default function LocationTracker() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address) {
        const city = address.city || address.town || address.village || 'Unknown City';
        const state = address.region || address.state || 'Unknown State';
        return `${city}, ${state}`;
      }
      return 'Location not found';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location not found';
    }
  };

  const requestLocationPermission = async () => {
    try {
      setIsLoading(true);
      // First check if we already have permission
      let { status } = await Location.getForegroundPermissionsAsync();
      
      // If we don't have permission, request it
      if (status !== 'granted') {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }

      if (status === 'granted') {
        setPermissionDenied(false);
        // Get fresh location
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(location);
        
        // Get address for the new location
        const address = await getAddressFromCoordinates(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentAddress(address);
        
        // Restart location tracking
        startLocationTracking();
      } else {
        setPermissionDenied(true);
        setErrorMsg('Permission to access location was denied');
      }
    } catch (error) {
      setErrorMsg('Error getting location: ' + error.message);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (newLocation) => {
          setLocation(newLocation);
          const address = await getAddressFromCoordinates(
            newLocation.coords.latitude,
            newLocation.coords.longitude
          );
          setCurrentAddress(address);
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error in location tracking:', error);
      setErrorMsg('Error tracking location: ' + error.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setPermissionDenied(true);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        const address = await getAddressFromCoordinates(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentAddress(address);

        const subscription = await startLocationTracking();

        return () => {
          if (subscription) {
            subscription.remove();
          }
        };
      } catch (error) {
        setErrorMsg('Error initializing location: ' + error.message);
        Alert.alert('Error', 'Failed to initialize location services. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await Location.geocodeAsync(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = async (data, details) => {
    try {
      setIsLoading(true);
      setLocation({
        coords: {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng
        }
      });

      const address = await getAddressFromCoordinates(
        details.geometry.location.lat,
        details.geometry.location.lng
      );
      setCurrentAddress(address);
      setShowManualEntry(false);
      setPermissionDenied(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to set location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleLocationSelect(null, item)}
    >
      <Text style={styles.searchResultText}>
        {item.name || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
      </Text>
      <Text style={styles.searchResultSubtext}>
        {item.street ? `${item.street}, ` : ''}
        {item.city ? `${item.city}, ` : ''}
        {item.region ? `${item.region}, ` : ''}
        {item.country || ''}
      </Text>
    </TouchableOpacity>
  );

  if (permissionDenied) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>
          Festival requires your location to work,{' '}
          <Text 
            style={styles.link}
            onPress={requestLocationPermission}
          >
            click here
          </Text>
          {' '}to let us know where the fun is at! Or{' '}
          <Text 
            style={styles.link}
            onPress={() => setShowManualEntry(true)}
          >
            enter manually
          </Text>
        </Text>

        <Modal
          visible={showManualEntry}
          animationType="slide"
          transparent={true}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Location</Text>
              <Text style={styles.modalSubtitle}>Search for a location</Text>
              
              <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                  placeholder="Enter city, address, or landmark"
                  onPress={handleLocationSelect}
                  query={{
                    key: 'YOUR_GOOGLE_PLACES_API_KEY', // Replace with your actual API key
                    language: 'en',
                    types: '(cities)',
                  }}
                  fetchDetails={true}
                  onFail={error => console.error(error)}
                  onNotFound={() => console.log('No results found')}
                  textInputProps={{
                    style: styles.searchInput,
                    value: searchQuery,
                    onChangeText: setSearchQuery,
                  }}
                  listViewDisplayed={false}
                  enablePoweredByContainer={false}
                  styles={{
                    container: styles.placesAutocompleteContainer,
                    row: styles.placesAutocompleteRow,
                    description: styles.placesAutocompleteDescription,
                    textInputContainer: styles.placesAutocompleteTextInputContainer,
                  }}
                />
              </View>

              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
                style={styles.searchResultsList}
                ListEmptyComponent={
                  searchQuery ? (
                    <Text style={styles.noResultsText}>No locations found</Text>
                  ) : null
                }
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={() => {
                    setShowManualEntry(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentAddress && (
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>
              Current Location: {currentAddress}
            </Text>
            <TouchableOpacity 
              style={[styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
              onPress={requestLocationPermission}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#2089dc" size="small" />
              ) : (
                <Text style={styles.refreshButtonText}>↻</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Updating location...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingContainer: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  link: {
    color: '#2089dc',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#2089dc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  searchIndicator: {
    marginLeft: 8,
  },
  searchResultsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  searchResultSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  placesAutocompleteContainer: {
    flex: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  placesAutocompleteRow: {
    backgroundColor: '#fff',
    padding: 13,
    height: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  placesAutocompleteDescription: {
    color: '#000',
  },
  placesAutocompleteTextInputContainer: {
    width: '100%',
  },
}); 