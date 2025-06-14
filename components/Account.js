import React from 'react'
import { StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button } from '@rneui/themed'
import { COLORS } from '../constants/colors'

export default function Account() {
  return (
    <View style={styles.container}>
      <View style={styles.verticallySpaced}>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} buttonStyle={{ borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
}) 

