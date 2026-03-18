import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function EmergencyAlertSetupScreen({ navigation, route }) {
  const { isPremiumUser = false, voiceDetectionEnabled = false, customVoiceCommand = '' } = route.params || {};

  const [voiceEnabled, setVoiceEnabled] = useState(voiceDetectionEnabled);
  const [customCommand, setCustomCommand] = useState(customVoiceCommand);
  const [alertTrustedContacts, setAlertTrustedContacts] = useState(true);
  const [sendLocation, setSendLocation] = useState(true);
  const [callPolice, setCallPolice] = useState(false);
  const [silentMode, setSilentMode] = useState(false);

  const handleSaveSettings = () => {
    // Save settings logic here
    Alert.alert('Success', 'Emergency alert settings saved!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Pro',
      'Get unlimited voice alerts, custom commands, and premium features for R99/month',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => console.log('Navigate to subscription') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Alerts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[COLORS.error, '#DC2626']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="alert-octagon" size={48} color={COLORS.white} />
          <Text style={styles.heroTitle}>Quick Emergency Response</Text>
          <Text style={styles.heroDescription}>
            Configure your emergency alert preferences to ensure rapid response when you need help
          </Text>
        </LinearGradient>

        {/* Voice Detection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="microphone" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Voice Detection</Text>
          </View>

          {/* Voice Detection Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
              <Text style={styles.infoTitle}>How Voice Detection Works</Text>
            </View>
            <Text style={styles.infoText}>
              Voice detection allows you to trigger an emergency alert hands-free by speaking a command. 
              This is useful when you cannot access your phone.
            </Text>
          </View>

          {/* Voice Settings Card */}
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <MaterialCommunityIcons name="microphone-settings" size={20} color={COLORS.success} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Enable Voice Detection</Text>
                  <Text style={styles.settingDescription}>
                    Activate hands-free emergency alerts
                  </Text>
                </View>
              </View>
              <Switch
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={voiceEnabled ? COLORS.primary : COLORS.textTertiary}
              />
            </View>

            {voiceEnabled && (
              <>
                <View style={styles.divider} />

                {/* Free Version Info */}
                {!isPremiumUser && (
                  <View style={styles.freeVersionCard}>
                    <View style={styles.freeHeaderRow}>
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE VERSION</Text>
                      </View>
                      <Text style={styles.freeSubtext}>Limited Features</Text>
                    </View>

                    <View style={styles.featureList}>
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={styles.featureText}>
                          Say <Text style={styles.commandText}>"SafeLink SafeLink"</Text> to alert
                        </Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                        <Text style={styles.featureText}>1 alert per day limit</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                        <Text style={styles.featureText}>No custom commands</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.upgradeCard} onPress={handleUpgrade}>
                      <View style={styles.upgradeLeft}>
                        <Ionicons name="star" size={24} color={COLORS.warning} />
                        <View>
                          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                          <Text style={styles.upgradeSubtitle}>Unlimited alerts & custom commands</Text>
                        </View>
                      </View>
                      <Ionicons name="arrow-forward" size={20} color={COLORS.warning} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Premium Version */}
                {isPremiumUser && (
                  <View style={styles.premiumCard}>
                    <View style={styles.premiumHeaderRow}>
                      <View style={styles.proBadge}>
                        <Ionicons name="star" size={12} color={COLORS.white} />
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                      <Text style={styles.premiumSubtext}>Premium Features Active</Text>
                    </View>

                    <View style={styles.featureList}>
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={styles.featureText}>Unlimited voice alerts</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={styles.featureText}>Custom voice commands</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={styles.featureText}>Priority alert delivery</Text>
                      </View>
                    </View>

                    <View style={styles.customCommandSection}>
                      <Text style={styles.customCommandLabel}>Custom Voice Command</Text>
                      <Text style={styles.customCommandHint}>
                        Set your personal emergency phrase (2-4 words)
                      </Text>
                      <TextInput
                        style={styles.customCommandInput}
                        placeholder="e.g., Help me now, Emergency alert"
                        placeholderTextColor={COLORS.textTertiary}
                        value={customCommand}
                        onChangeText={setCustomCommand}
                      />
                      <Text style={styles.customCommandNote}>
                        💡 Tip: Choose a unique phrase you won't say accidentally
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Alert Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Alert Actions</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
              <Text style={styles.infoTitle}>What Happens When You Alert</Text>
            </View>
            <Text style={styles.infoText}>
              When an emergency alert is triggered, the following actions will be performed automatically based on your preferences.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Alert Trusted Contacts</Text>
                  <Text style={styles.settingDescription}>
                    Send SMS & email to emergency contacts
                  </Text>
                </View>
              </View>
              <Switch
                value={alertTrustedContacts}
                onValueChange={setAlertTrustedContacts}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={alertTrustedContacts ? COLORS.primary : COLORS.textTertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="location" size={20} color={COLORS.success} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Share Live Location</Text>
                  <Text style={styles.settingDescription}>
                    Send your current GPS coordinates
                  </Text>
                </View>
              </View>
              <Switch
                value={sendLocation}
                onValueChange={setSendLocation}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={sendLocation ? COLORS.primary : COLORS.textTertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${COLORS.error}15` }]}>
                  <Ionicons name="call" size={20} color={COLORS.error} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Auto-Call Emergency Services</Text>
                  <Text style={styles.settingDescription}>
                    Automatically dial 10111 (SAPS)
                  </Text>
                </View>
              </View>
              <Switch
                value={callPolice}
                onValueChange={setCallPolice}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={callPolice ? COLORS.primary : COLORS.textTertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                  <Ionicons name="volume-mute" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Silent Mode</Text>
                  <Text style={styles.settingDescription}>
                    Send alerts without sound or vibration
                  </Text>
                </View>
              </View>
              <Switch
                value={silentMode}
                onValueChange={setSilentMode}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={silentMode ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <MaterialCommunityIcons name="shield-alert" size={24} color={COLORS.warning} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Important Safety Notice</Text>
            <Text style={styles.noticeText}>
              Voice detection works best in quiet environments. Always have a backup method to trigger alerts. 
              Test your settings regularly to ensure they work as expected.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.saveButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 12,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoCard: {
    backgroundColor: `${COLORS.primary}08`,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 66,
  },
  freeVersionCard: {
    padding: 16,
    backgroundColor: COLORS.backgroundSecondary,
  },
  freeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  freeBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  freeSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  featureList: {
    gap: 10,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  commandText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.warning}15`,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
  },
  upgradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  upgradeSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  premiumCard: {
    padding: 16,
    backgroundColor: `${COLORS.primary}05`,
  },
  premiumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  premiumSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  customCommandSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customCommandLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  customCommandHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  customCommandInput: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customCommandNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.warning}15`,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});