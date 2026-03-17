import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { EmailService } from '../../services/emailService';
import { SmsService } from '../../services/smsService';
import { auth, firestore } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import HomeScreen from './HomeScreen';
import ReportsScreen from './ReportsScreen';
import SmartChatScreen from './SmartChatScreen';
import TrustedContactsScreen from './TrustedContactsScreen';
import SettingsScreen from './SettingsScreen'; // Import the new screen

const { width: screenWidth } = Dimensions.get('window');

const TABS = [
  { id: 'home', name: 'Home', icon: 'home', component: (props) => <HomeScreen {...props} onNavigateToReports={handleNavigateToReports} /> },
  { id: 'reports', name: 'Reports', icon: 'map', component: (props) => <ReportsScreen {...props} /> },
  { id: 'chat', name: 'Smart Chat', icon: 'chatbubbles', component: SmartChatScreen },
  { id: 'contacts', name: 'Contacts', icon: 'people', component: TrustedContactsScreen },
  { id: 'settings', name: 'Settings', icon: 'settings', component: SettingsScreen },
];

const ComingSoonScreen = ({ title }) => (
  <View style={styles.comingSoonContainer}>
    <Ionicons name="construct-outline" size={64} color={COLORS.primary} />
    <Text style={styles.comingSoonTitle}>{title}</Text>
    <Text style={styles.comingSoonText}>Coming Soon</Text>
  </View>
);


export default function MainScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('home');
  const [panicPressed, setPanicPressed] = useState(false);
  const panicAnim = useRef(new Animated.Value(0)).current;
  const [reportsRoute, setReportsRoute] = useState(null);

  const handleNavigateToReports = (focusLocation) => {
    setActiveTab('reports');
    setReportsRoute({ focusLocation });
    
    // Clear the route after a short delay to allow the screen to process it
    setTimeout(() => {
      setReportsRoute(null);
    }, 1000);
  };

  const TABS = [
    { id: 'home', name: 'Home', icon: 'home', component: (props) => <HomeScreen {...props} onNavigateToReports={handleNavigateToReports} /> },
    { id: 'reports', name: 'HeatMap', icon: 'map', component: (props) => <ReportsScreen {...props} /> },
    { id: 'chat', name: 'Smart Chat', icon: 'chatbubbles', component: SmartChatScreen },
    { id: 'contacts', name: 'Contacts', icon: 'people', component: TrustedContactsScreen },
    { id: 'settings', name: 'Settings', icon: 'settings', component: SettingsScreen },
  ];

  const getUserName = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return 'SafeLink User';

      // Try to get display name from Firebase Auth
      if (currentUser.displayName) {
        return currentUser.displayName;
      }

      // Try to get name from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().displayName) {
        return userDoc.data().displayName;
      }

      // Fallback to email username
      if (currentUser.email) {
        return currentUser.email.split('@')[0];
      }

      return 'SafeLink User';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'SafeLink User';
    }
  };

  const getLocationString = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return 'Location access denied';
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Try to get address from coordinates
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (address && address.length > 0) {
          const addr = address[0];
          const parts = [
            addr.street,
            addr.streetNumber,
            addr.city || addr.subregion,
            addr.region,
            addr.country,
          ].filter(Boolean);
          
          return `${parts.join(', ')} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        }
      } catch (reverseError) {
        console.log('Reverse geocoding failed, using coordinates');
      }

      return `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting location:', error);
      return 'Location unavailable';
    }
  };

  const handlePanicButton = () => {
    Animated.sequence([
      Animated.timing(panicAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(panicAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setPanicPressed(true);
    Alert.alert(
      'Emergency Alert',
      'Are you in danger? This will immediately alert all your trusted contacts via SMS and Email with your location.',
      [
        {
          text: 'Cancel',
          onPress: () => setPanicPressed(false),
          style: 'cancel',
        },
        {
          text: 'Send Alert',
          onPress: handleSendEmergencyAlert,
          style: 'destructive',
        },
      ]
    );
  };

  const handleSendEmergencyAlert = async () => {
    try {
      // Get user information
      const currentUser = auth.currentUser;
      const userName = await getUserName();
      const userPhone = currentUser?.phoneNumber || 'Not provided';
      
      // Get actual GPS location
      const locationString = await getLocationString();
      
      // Prepare alert data
      const alertData = {
        userName,
        userPhone,
        location: locationString,
        timestamp: new Date().toLocaleString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        }),
      };

      // Send both Email and SMS alerts in background
      const [emailResult, smsResult] = await Promise.all([
        EmailService.sendEmergencyAlertToContacts(alertData),
        SmsService.sendEmergencySMSToContacts(alertData)
      ]);
      
      // Combine results
      const result = {
        success: emailResult.success || smsResult.success,
        message: emailResult.message || smsResult.message,
        details: {
          email: emailResult,
          sms: smsResult
        }
      };
      
      setPanicPressed(false);

      if (result.success) {
        // Show detailed success message
        let detailMessage = '';
        if (result.details) {
          if (result.details.email.success) {
            detailMessage += `Email: ${result.details.email.message}\n`;
          }
          if (result.details.sms.success) {
            detailMessage += `SMS: ${result.details.sms.message}`;
          }
        }

        Alert.alert(
          'Alert Sent Successfully',
          detailMessage || result.message,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Show which alerts failed
        let errorMessage = result.message;
        if (result.details) {
          errorMessage += '\n\n';
          if (!result.details.email.success) {
            errorMessage += `Email: ${result.details.email.message}\n`;
          }
          if (!result.details.sms.success) {
            errorMessage += `SMS: ${result.details.sms.message}`;
          }
        }

        Alert.alert(
          'Alert Failed',
          errorMessage,
          [
            { 
              text: 'Retry', 
              onPress: handleSendEmergencyAlert,
              style: 'default'
            },
            { 
              text: 'Call 10111', 
              onPress: () => {},
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      setPanicPressed(false);
      
      Alert.alert(
        'Error',
        'An error occurred while sending the alert. Please call emergency services at 10111.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const panicScale = panicAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  const panicOpacity = panicAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component;
  
  // Always pass route object to prevent undefined errors
  const activeProps = activeTab === 'reports' 
    ? { navigation, route: { params: reportsRoute || {} } }
    : { navigation };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {React.isValidElement(ActiveComponent) 
          ? ActiveComponent 
          : <ActiveComponent {...activeProps} />
        }
      </View>

      {/* Floating Panic Button */}
      <View style={styles.panicButtonContainer}>
        <Animated.View
          style={[
            styles.panicButtonWrapper,
            {
              transform: [{ scale: panicScale }],
              opacity: panicOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.panicButton, panicPressed && styles.panicButtonPressed]}
            onPress={handlePanicButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={panicPressed ? ['#DC2626', '#B91C1C'] : ['#EF4444', '#DC2626']}
              style={styles.panicGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name="warning" 
                size={28} 
                color={COLORS.white} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Liquid Glass Bottom Tab Navigation */}
      <View style={styles.tabBarContainer}>
        <BlurView intensity={95} tint="systemUltraThinMaterial" style={styles.tabBarBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.liquidGlassOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tabIconContainer, isActive && styles.tabIconContainerActive]}>
                    <Ionicons
                      name={isActive ? tab.icon : `${tab.icon}-outline`}
                      size={22}
                      color={isActive ? COLORS.primary : COLORS.textSecondary}
                    />
                    {isActive && (
                      <View style={styles.activeIndicator} />
                    )}
                  </View>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
        
        <View style={styles.bottomSafeArea} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  panicButtonContainer: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    zIndex: 1000,
  },
  panicButtonWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  panicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  panicGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
  },
  tabBarBlur: {
    overflow: 'hidden',
    borderTopLeftRadius: 48,
    borderBottomLeftRadius: 50,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  liquidGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    opacity: 0.6,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -25,
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  bottomSafeArea: {
    height: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: 'transparent',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});