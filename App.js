import 'react-native-reanimated';
import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { View, StyleSheet } from 'react-native'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Account from './components/Account'

// Import screens
import HomeScreen from './screens/HomeScreen'
import SettingsScreen from './screens/SettingsScreen'
import BalanceScreen from './screens/BalanceScreen'
import InboxScreen from './screens/InboxScreen'

// App State for session refresh
import { AppState } from 'react-native'
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

const Drawer = createDrawerNavigator()

function MainNavigator() {
  return (
    <Drawer.Navigator 
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2089dc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Drawer.Screen 
        name="Account" 
        component={Account}
        options={{
          title: 'Account',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Drawer.Screen 
        name="Balance" 
        component={BalanceScreen}
        options={{
          title: 'Balance',
        }}
      />
      <Drawer.Screen 
        name="Inbox" 
        component={InboxScreen}
        options={{
          title: 'Inbox',
        }}
      />
    </Drawer.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <NavigationContainer>
      {session && session.user ? (
        <MainNavigator />
      ) : (
        <Auth />
      )}
    </NavigationContainer>
  )
}