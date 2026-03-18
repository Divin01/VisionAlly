import React, { useState, useEffect } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { auth, firestore } from '../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../../utils/storage';

const PROFILE_PICTURE_KEY = '@visionally_profile_picture';
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
];

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User Profile Data
  const [profilePicture, setProfilePicture] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  // App Settings
  const [notifications, setNotifications] = useState(true);
  const [jobRecommendations, setJobRecommendations] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [language, setLanguage] = useState('en');
  const [jobRecommendationFrequency, setJobRecommendationFrequency] = useState('daily');

  // Security Settings
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [autoLock, setAutoLock] = useState(true);

  // Edit States
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || '');
          setEmail(user.email || '');
          setPhoneNumber(data.phoneNumber || '');
          setBio(data.bio || '');
          setLocation(data.location || '');
        } else {
          setEmail(user.email || '');
        }

        const savedPicture = await AsyncStorage.getItem(PROFILE_PICTURE_KEY);
        if (savedPicture) {
          setProfilePicture(savedPicture);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@visionally_app_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotifications(settings.notifications ?? true);
        setJobRecommendations(settings.jobRecommendations ?? true);
        setInterviewReminders(settings.interviewReminders ?? true);
        setSoundEffects(settings.soundEffects ?? true);
        setBiometricAuth(settings.biometricAuth ?? false);
        setAutoLock(settings.autoLock ?? true);
        setLanguage(settings.language ?? 'en');
        setJobRecommendationFrequency(settings.jobRecommendationFrequency ?? 'daily');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const settings = {
        notifications,
        jobRecommendations,
        interviewReminders,
        soundEffects,
        biometricAuth,
        autoLock,
        language,
        jobRecommendationFrequency,
        ...newSettings,
      };
      await AsyncStorage.setItem('@visionally_app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to select a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setProfilePicture(imageUri);
        await AsyncStorage.setItem(PROFILE_PICTURE_KEY, imageUri);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        await updateDoc(docRef, {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          bio: bio.trim(),
          location: location.trim(),
          updatedAt: new Date().toISOString(),
        });

        setEditingProfile(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Please log out and log in again to change your password');
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              await StorageService.clearUserSession();
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };



  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIconWrapper}>
            <Ionicons name="eye" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.appNameContainer}>
            <Text style={styles.appName}>
              <Text style={styles.visionText}>Vision</Text>
              <Text style={styles.allyText}>Ally</Text>
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>Settings & Preferences</Text>
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person" size={22} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Profile</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.profileImageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>

        {editingProfile ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.flagEmoji}>🇿🇦</Text>
                  <Text style={styles.countryCodeText}>+27</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="123456789"
                  placeholderTextColor={COLORS.textTertiary}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City, Province"
                placeholderTextColor={COLORS.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about yourself..."
                placeholderTextColor={COLORS.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => {
                  setEditingProfile(false);
                  loadUserData();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{displayName || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>
                {phoneNumber ? `+27 ${phoneNumber}` : 'Not set'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setEditingProfile(true)}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderCareerSettingsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="briefcase" size={22} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Career Settings</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialCommunityIcons name="bell-badge" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Job Recommendations</Text>
              <Text style={styles.settingDescription}>Get notified about new opportunities</Text>
            </View>
          </View>
          <Switch
            value={jobRecommendations}
            onValueChange={(value) => {
              setJobRecommendations(value);
              saveSettings({ jobRecommendations: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={jobRecommendations ? COLORS.primary : COLORS.textTertiary}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            Alert.alert(
              'Job Recommendation Frequency',
              'How often would you like to receive job recommendations?',
              [
                {
                  text: 'Daily',
                  onPress: () => {
                    setJobRecommendationFrequency('daily');
                    saveSettings({ jobRecommendationFrequency: 'daily' });
                  }
                },
                {
                  text: 'Weekly',
                  onPress: () => {
                    setJobRecommendationFrequency('weekly');
                    saveSettings({ jobRecommendationFrequency: 'weekly' });
                  }
                },
                {
                  text: 'Monthly',
                  onPress: () => {
                    setJobRecommendationFrequency('monthly');
                    saveSettings({ jobRecommendationFrequency: 'monthly' });
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <MaterialCommunityIcons name="calendar-frequency" size={20} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Frequency</Text>
              <Text style={styles.settingDescription}>
                {jobRecommendationFrequency.charAt(0).toUpperCase() + jobRecommendationFrequency.slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.warning}15` }]}>
              <MaterialCommunityIcons name="video-outline" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Interview Reminders</Text>
              <Text style={styles.settingDescription}>Get alerts before scheduled interviews</Text>
            </View>
          </View>
          <Switch
            value={interviewReminders}
            onValueChange={(value) => {
              setInterviewReminders(value);
              saveSettings({ interviewReminders: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={interviewReminders ? COLORS.primary : COLORS.textTertiary}
          />
        </View>
      </View>
    </View>
  );

  const renderSecuritySection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setEditingPassword(!editingPassword)}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="key" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingDescription}>Update your password</Text>
            </View>
          </View>
          <Ionicons
            name={editingPassword ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {editingPassword && (
          <View style={styles.passwordForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textTertiary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={handleChangePassword}
              disabled={saving}
            >
              <LinearGradient
                colors={[COLORS.warning, '#F97316']}
                style={styles.changePasswordGradient}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.changePasswordText}>Update Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <MaterialCommunityIcons name="fingerprint" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Biometric Authentication</Text>
              <Text style={styles.settingDescription}>Use fingerprint/face ID</Text>
            </View>
          </View>
          <Switch
            value={biometricAuth}
            onValueChange={(value) => {
              setBiometricAuth(value);
              saveSettings({ biometricAuth: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={biometricAuth ? COLORS.primary : COLORS.textTertiary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.error}20` }]}>
              <Ionicons name="lock-closed" size={20} color={COLORS.error} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-Lock</Text>
              <Text style={styles.settingDescription}>Lock app when inactive</Text>
            </View>
          </View>
          <Switch
            value={autoLock}
            onValueChange={(value) => {
              setAutoLock(value);
              saveSettings({ autoLock: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={autoLock ? COLORS.primary : COLORS.textTertiary}
          />
        </View>
      </View>
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={22} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Preferences</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}20` }]}>
              <Ionicons name="notifications" size={20} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive app notifications</Text>
            </View>
          </View>
          <Switch
            value={notifications}
            onValueChange={(value) => {
              setNotifications(value);
              saveSettings({ notifications: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notifications ? COLORS.primary : COLORS.textTertiary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <MaterialCommunityIcons name="accessibility" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Accessibility</Text>
              <Text style={styles.settingDescription}>Enhance app for your needs</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="volume-high" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sound Effects</Text>
              <Text style={styles.settingDescription}>App sounds and alerts</Text>
            </View>
          </View>
          <Switch
            value={soundEffects}
            onValueChange={(value) => {
              setSoundEffects(value);
              saveSettings({ soundEffects: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={soundEffects ? COLORS.primary : COLORS.textTertiary}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            Alert.alert(
              'Select Language',
              'Choose your preferred language',
              [
                ...LANGUAGES.map(lang => ({
                  text: `${lang.flag} ${lang.name}`,
                  onPress: () => {
                    setLanguage(lang.code);
                    saveSettings({ language: lang.code });
                  }
                })),
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <Ionicons name="language" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingDescription}>
                {LANGUAGES.find(l => l.code === language)?.name || 'English'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle" size={22} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>About & Support</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <Ionicons name="help-circle" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Help Center</Text>
              <Text style={styles.settingDescription}>Get help and support</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}20` }]}>
              <Ionicons name="document-text" size={20} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>How we protect your data</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.textSecondary}20` }]}>
              <Ionicons name="code-slash" size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDangerZone = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="warning" size={22} color={COLORS.error} />
        <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="log-out" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: COLORS.warning }]}>Logout</Text>
              <Text style={styles.settingDescription}>Sign out of your account</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.warning} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}
        {renderCareerSettingsSection()}
        {renderSecuritySection()}
        {renderPreferencesSection()}
        {renderAboutSection()}
        {renderDangerZone()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for your career</Text>
          <Text style={styles.footerVersion}>VisionAlly v1.0.0</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    ...Platform.select({
      ios: {

      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appNameContainer: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  visionText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  allyText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: 54,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  profileInfo: {
    padding: 20,
    paddingTop: 0,
  },
  profileInfoRow: {
    paddingVertical: 12,
  },
  profileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  editForm: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {},
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  passwordForm: {
    padding: 16,
    paddingTop: 0,
    gap: 14,
  },
  changePasswordButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  changePasswordGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  voiceInfoCard: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  voiceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voiceInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  freeBadge: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.success,
  },
  proBadge: {
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.warning,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerVersion: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});