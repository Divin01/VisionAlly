import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Porcupine from '@picovoice/porcupine-react-native';

// Storage keys
const VOICE_SETTINGS_KEY = '@visionally_voice_settings';
const DAILY_ALERT_KEY = '@safelink_daily_alert';

class VoiceDetectionService {
  constructor() {
    this.porcupineManager = null;
    this.isListening = false;
    this.detectionCallback = null;
    this.keywordDetectionCount = 0;
    this.lastDetectionTime = null;
    this.detectionTimeout = null;
    this.isPremiumUser = false;
    this.customKeyword = 'safelink'; // Default wake word
    
    // Access key from Picovoice Console 
    this.accessKey = '';
  }

  /**
   * Initialize voice detection service
   */
  async initialize(isPremium = false, customCommand = '') {
    try {
      this.isPremiumUser = isPremium;
      
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Microphone permission not granted');
        return {
          success: false,
          message: 'Microphone permission required for voice detection'
        };
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, // Expo Go limitation
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Voice detection service initialized');
      return {
        success: true,
        message: 'Voice detection ready'
      };

    } catch (error) {
      console.error('Error initializing voice detection:', error);
      return {
        success: false,
        message: 'Failed to initialize voice detection'
      };
    }
  }

  /**
   * Start listening for wake word
   */
  async startListening(onDetectionCallback) {
    try {
      if (this.isListening) {
        console.log('Already listening');
        return { success: true, message: 'Already listening' };
      }

      // Check if we can send alert today (free users only)
      if (!this.isPremiumUser) {
        const canAlert = await this.checkDailyLimit();
        if (!canAlert) {
          return {
            success: false,
            message: 'Daily alert limit reached. Upgrade to Pro for unlimited alerts.'
          };
        }
      }

      this.detectionCallback = onDetectionCallback;
      this.keywordDetectionCount = 0;

      // Initialize Porcupine with built-in wake word
      try {
        this.porcupineManager = await Porcupine.PorcupineManager.fromBuiltInKeywords(
          this.accessKey,
          [Porcupine.BuiltInKeywords.PORCUPINE], // Using "Porcupine" as wake word
          (keywordIndex) => this.handleWakeWordDetection(keywordIndex),
          (error) => {
            console.error('Porcupine error:', error);
            this.handleError(error);
          }
        );

        await this.porcupineManager.start();
        this.isListening = true;

        console.log('Started listening for wake word');
        return {
          success: true,
          message: 'Voice detection active'
        };

      } catch (porcupineError) {
        console.error('Porcupine initialization error:', porcupineError);
        
        // Fallback: Use basic audio recording for demo
        return await this.startBasicVoiceDetection(onDetectionCallback);
      }

    } catch (error) {
      console.error('Error starting voice detection:', error);
      return {
        success: false,
        message: 'Failed to start voice detection'
      };
    }
  }

  /**
   * Basic voice detection fallback (for demo without Porcupine)
   * This is a simplified version that detects audio input
   */
  async startBasicVoiceDetection(onDetectionCallback) {
    try {
      this.detectionCallback = onDetectionCallback;
      this.isListening = true;

      // For demo purposes: Show instruction to user
      Alert.alert(
        'Voice Detection Active',
        'For demonstration: Tap the "Test Voice Alert" button to simulate voice detection.\n\nIn production with Porcupine: Say "Porcupine Porcupine" to trigger alert.',
        [{ text: 'OK' }]
      );

      return {
        success: true,
        message: 'Demo voice detection active (tap test button to simulate)'
      };

    } catch (error) {
      console.error('Error in basic voice detection:', error);
      return {
        success: false,
        message: 'Failed to start voice detection'
      };
    }
  }

  /**
   * Handle wake word detection
   */
  handleWakeWordDetection(keywordIndex) {
    const now = Date.now();
    
    // Reset count if too much time passed since last detection
    if (this.lastDetectionTime && (now - this.lastDetectionTime) > 3000) {
      this.keywordDetectionCount = 0;
    }

    this.keywordDetectionCount++;
    this.lastDetectionTime = now;

    console.log(`Wake word detected! Count: ${this.keywordDetectionCount}`);

    // Free users: need 2 detections (SafeLink SafeLink)
    // Premium users: 1 detection (custom command)
    const requiredDetections = this.isPremiumUser ? 1 : 2;

    if (this.keywordDetectionCount >= requiredDetections) {
      console.log('Voice alert triggered!');
      this.keywordDetectionCount = 0;
      
      // Trigger alert callback
      if (this.detectionCallback) {
        this.detectionCallback();
      }
    } else {
      // Waiting for second "SafeLink"
      console.log(`Waiting for confirmation... (${this.keywordDetectionCount}/${requiredDetections})`);
    }
  }

  /**
   * Simulate voice detection for testing (demo mode)
   */
  async simulateVoiceDetection() {
    if (!this.isListening) {
      return {
        success: false,
        message: 'Voice detection not active'
      };
    }

    console.log('Simulating voice detection...');
    
    // Simulate first "SafeLink"
    this.handleWakeWordDetection(0);
    
    // Simulate second "SafeLink" after 1 second
    setTimeout(() => {
      this.handleWakeWordDetection(0);
    }, 1000);

    return {
      success: true,
      message: 'Voice detection simulated'
    };
  }

  /**
   * Stop listening
   */
  async stopListening() {
    try {
      if (this.porcupineManager) {
        await this.porcupineManager.stop();
        await this.porcupineManager.delete();
        this.porcupineManager = null;
      }

      this.isListening = false;
      this.keywordDetectionCount = 0;
      this.detectionCallback = null;

      if (this.detectionTimeout) {
        clearTimeout(this.detectionTimeout);
        this.detectionTimeout = null;
      }

      console.log('Stopped voice detection');
      return {
        success: true,
        message: 'Voice detection stopped'
      };

    } catch (error) {
      console.error('Error stopping voice detection:', error);
      return {
        success: false,
        message: 'Error stopping voice detection'
      };
    }
  }

  /**
   * Check daily alert limit for free users
   */
  async checkDailyLimit() {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(DAILY_ALERT_KEY);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if it's the same day
        if (data.date === today) {
          // Free users: 1 alert per day
          if (data.count >= 1) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Increment daily alert count
   */
  async incrementDailyCount() {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(DAILY_ALERT_KEY);
      
      let data = { date: today, count: 0 };
      
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          data = parsed;
        }
      }
      
      data.count += 1;
      await AsyncStorage.setItem(DAILY_ALERT_KEY, JSON.stringify(data));
      
      return data.count;
    } catch (error) {
      console.error('Error incrementing daily count:', error);
      return 0;
    }
  }

  /**
   * Get remaining alerts for today
   */
  async getRemainingAlerts() {
    try {
      if (this.isPremiumUser) {
        return 999; // Unlimited
      }

      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(DAILY_ALERT_KEY);
      
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
          return Math.max(0, 1 - data.count);
        }
      }
      
      return 1; // Default: 1 alert available
    } catch (error) {
      console.error('Error getting remaining alerts:', error);
      return 1;
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Voice detection error:', error);
    this.stopListening();
  }

  /**
   * Check if currently listening
   */
  getIsListening() {
    return this.isListening;
  }

  /**
   * Get detection count (for debugging)
   */
  getDetectionCount() {
    return this.keywordDetectionCount;
  }
}

// Export singleton instance
export const VoiceDetection = new VoiceDetectionService();
export default VoiceDetection;