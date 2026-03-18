import CONFIG from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';

const WHATSAPP_BASE_URL = 'https://chat.africastalking.com/whatsapp';
const STORAGE_KEY = '@visionally_trusted_contacts';

export const WhatsAppService = {
  /**
   * Send a WhatsApp template message for emergency alerts
   */
  sendEmergencyTemplate: async (alertData) => {
    try {
      const { userName, userPhone, location, timestamp } = alertData;

      // Get trusted contacts
      const contacts = await WhatsAppService.getTrustedContacts();

      if (!contacts || contacts.length === 0) {
        return {
          success: false,
          message: 'No trusted contacts found. Please add contacts first.',
        };
      }

      // Filter contacts with valid phone numbers
      const validContacts = contacts.filter(c => c.phone && c.phone.length === 9);

      if (validContacts.length === 0) {
        return {
          success: false,
          message: 'No valid phone numbers found in contacts.',
        };
      }

      // Send to each contact
      const results = await Promise.allSettled(
        validContacts.map(contact =>
          WhatsAppService.sendTemplate(
            `27${contact.phone}`, // South Africa format
            userName,
            location,
            timestamp,
            contact.name
          )
        )
      );

      // Count successes
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        return {
          success: true,
          message: `WhatsApp alert sent to ${successful} contact(s)${failed > 0 ? `, ${failed} failed` : ''}.`,
          details: {
            total: results.length,
            successful,
            failed,
          },
        };
      } else {
        return {
          success: false,
          message: 'Failed to send WhatsApp alerts to any contacts.',
          details: {
            total: results.length,
            successful: 0,
            failed: results.length,
          },
        };
      }
    } catch (error) {
      console.error('WhatsApp Service Error:', error);
      return {
        success: false,
        message: `WhatsApp error: ${error.message}`,
      };
    }
  },

  /**
   * Send template to individual contact
   */
  sendTemplate: async (phoneNumber, userName, location, timestamp, contactName) => {
    try {
      const templateData = {
        username: CONFIG.SMS_USERNAME,
        waNumber: CONFIG.WHATSAPP_NUMBER, // Your WhatsApp Business number
        name: 'safelink_emergency_alert', // Template name (must be approved)
        language: 'en',
        category: 'UTILITY',
        components: {
          header: {
            type: 'HEADER',
            format: 'TEXT',
            text: '🚨 EMERGENCY ALERT - {{1}}',
            example: {
              header_text: [userName],
            },
          },
          body: {
            type: 'BODY',
            text: 'Hello {{1}},\n\n{{2}} has triggered an emergency alert!\n\n📍 Location: {{3}}\n⏰ Time: {{4}}\n\nPlease check on them immediately or contact emergency services.',
            example: {
              body_text: [contactName, userName, location, timestamp],
            },
          },
          footer: {
            type: 'FOOTER',
            text: 'VisionAlly - Your Employment Companion',
          },
          buttons: [
            {
              type: 'PHONE_NUMBER',
              text: 'Call Police (10111)',
              phoneNumber: '+2710111',
            },
            {
              type: 'URL',
              text: 'View Location',
              url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
              example: [`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`],
            },
          ],
        },
      };

      const response = await fetch(`${WHATSAPP_BASE_URL}/template/send`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apiKey': CONFIG.SMS_API_KEY,
        },
        body: JSON.stringify(templateData),
      });

      const data = await response.json();

      if (response.ok && data.status === 'Success') {
        return {
          success: true,
          message: 'WhatsApp template sent',
          templateId: data.templateId,
          status: data.templateStatus,
        };
      } else {
        throw new Error(data.message || 'Failed to send WhatsApp template');
      }
    } catch (error) {
      console.error('WhatsApp Template Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Send a text message (requires approved template in production)
   */
  sendTextMessage: async (phoneNumber, message) => {
    try {
      const messageData = {
        username: CONFIG.SMS_USERNAME,
        to: phoneNumber,
        message: message,
      };

      const response = await fetch(`${WHATSAPP_BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apiKey': CONFIG.SMS_API_KEY,
        },
        body: JSON.stringify(messageData),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'WhatsApp message sent',
          data,
        };
      } else {
        throw new Error(data.message || 'Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('WhatsApp Text Message Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Get trusted contacts from storage
   */
  getTrustedContacts: async () => {
    try {
      const userId = auth.currentUser?.uid;

      if (userId) {
        // Try Firebase first
        const docRef = doc(firestore, 'trustedContacts', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return docSnap.data().contacts || [];
        }
      }

      // Fallback to local storage
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      if (localData) {
        return JSON.parse(localData);
      }

      return [];
    } catch (error) {
      console.error('Error getting trusted contacts:', error);
      return [];
    }
  },

  /**
   * Test WhatsApp connection
   */
  testConnection: async (testPhoneNumber) => {
    try {
      const result = await WhatsAppService.sendTextMessage(
        testPhoneNumber,
        'This is a test message from VisionAlly. If you received this, WhatsApp integration is working!'
      );

      return result;
    } catch (error) {
      console.error('WhatsApp Test Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};