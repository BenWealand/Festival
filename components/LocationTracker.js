import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, AppState } from 'react-native';
import * as Location from 'expo-location';

export default function LocationTracker() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [address, setAddress] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permanentlyDenied, setPermanentlyDenied] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, refresh location
        requestLocationPermission();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  const openSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  };

  const requestLocationPermission = async () => {
    try {
      // First check if we can request permissions
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'denied') {
        // If permissions were previously denied, check if we can request them again
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (newStatus === 'denied') {
          setPermanentlyDenied(true);
          setPermissionDenied(true);
          setErrorMsg('Location permissions are required to show your city and state');
          return;
        }
      }

      // Get location after permission is granted
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);
      
      const formattedAddress = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      if (formattedAddress) {
        setAddress(formattedAddress);
      } else {
        setAddress('Location details unavailable');
      }
      
      setPermissionDenied(false);
      setPermanentlyDenied(false);
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setPermissionDenied(true);
      setErrorMsg('Error requesting location permission');
    }
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      console.log('Attempting to get address for coordinates:', latitude, longitude);
      
      // First try with Expo's reverse geocoding
      const [expoAddress] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      console.log('Expo address result:', expoAddress);
      
      if (expoAddress) {
        const city = expoAddress.city || expoAddress.town || expoAddress.village || 'Unknown City';
        const state = expoAddress.region || expoAddress.state || 'Unknown State';
        const formattedAddress = `${city}, ${state}`;
        console.log('Formatted address from Expo:', formattedAddress);
        return formattedAddress;
      }

      // If Expo geocoding fails, try with OpenStreetMap Nominatim API
      console.log('Expo geocoding failed, trying OpenStreetMap...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('OpenStreetMap response:', data);
      
      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || 'Unknown City';
        const state = data.address.state || data.address.county || 'Unknown State';
        const formattedAddress = `${city}, ${state}`;
        console.log('Formatted address from OpenStreetMap:', formattedAddress);
        return formattedAddress;
      }

      return null;
    } catch (error) {
      console.error('Detailed error in getAddressFromCoordinates:', error);
      return null;
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  return (
    <View style={styles.container}>
      {permissionDenied ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Let Festival know where the party is at!{' '}
            {permanentlyDenied ? (
              <TouchableOpacity onPress={openSettings}>
                <Text style={styles.permissionLink}>Open Settings</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={requestLocationPermission}>
                <Text style={styles.permissionLink}>Click here</Text>
              </TouchableOpacity>
            )}
            {' '}to enable location services.
          </Text>
        </View>
      ) : errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : location ? (
        <Text style={styles.text}>
          Location: {address || 'Getting address...'}
        </Text>
      ) : (
        <Text style={styles.text}>Getting location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  permissionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
  },
  permissionLink: {
    fontSize: 16,
    color: '#2089dc',
    textDecorationLine: 'underline',
  },
}); 