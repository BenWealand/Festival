// Design System Application Guide
// This script provides a template for applying the design system to screens

const DESIGN_SYSTEM_TEMPLATE = `
// Import the design system components
import BackgroundGradient from '../components/BackgroundGradient';
import GlassCard from '../components/GlassCard';
import GlowingButton from '../components/GlowingButton';
import { SafeAreaView } from 'react-native-safe-area-context';

// Wrap the main return with BackgroundGradient
return (
  <BackgroundGradient>
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Screen Title</Text>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        <GlassCard style={styles.section} borderRadius={16}>
          {/* Content goes here */}
        </GlassCard>
        
        {/* Quick Actions */}
        <GlassCard style={styles.section} borderRadius={16}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <GlowingButton
              text="Action 1"
              icon="icon-name"
              onPress={() => {}}
              buttonWidth={150}
              buttonHeight={120}
            />
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  </BackgroundGradient>
);

// Required styles
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
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
});
`;

const SCREENS_TO_UPDATE = [
  'BalanceScreen.js',
  'BusinessMenuScreen.js', 
  'AnalyticsScreen.js',
  'InboxScreen.js',
  'LocationMenuScreen.js',
  'GlobalTransactionsScreen.js',
  'EmployeeTipsScreen.js',
  'NotificationSettingsScreen.js',
  'BusinessStripeConnectScreen.js',
  'StripeOnboardingScreen.js',
  'MenuItemDetailScreen.js',
  'CustomersScreen.js',
  'CartScreen.js',
  'CustomerDetailsScreen.js',
  'ActiveOrdersScreen.js',
  'TransactionRatingScreen.js',
  'FailureScreen.js',
  'SuccessScreen.js'
];

console.log('Design System Application Guide');
console.log('===============================');
console.log('');
console.log('Screens to update:', SCREENS_TO_UPDATE.length);
console.log('Screens already updated: SettingsScreen, ProfileScreen, AllDepositsScreen, AllRedemptionsScreen');
console.log('');
console.log('Template for applying design system:');
console.log(DESIGN_SYSTEM_TEMPLATE);
console.log('');
console.log('Key components to use:');
console.log('- BackgroundGradient: For consistent background');
console.log('- GlassCard: For content containers');
console.log('- GlowingButton: For interactive buttons');
console.log('- SafeAreaView: For proper safe area handling');
console.log('');
console.log('Common style patterns:');
console.log('- Use rgba(255, 255, 255, 0.1) for input backgrounds');
console.log('- Use rgba(255, 255, 255, 0.2) for borders');
console.log('- Use COLORS.text.white for primary text');
console.log('- Use COLORS.text.muted for secondary text');
console.log('- Use 16px horizontal padding for containers');
console.log('- Use 24px bottom margin for sections'); 