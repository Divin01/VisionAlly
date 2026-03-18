import CONFIG from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Africa's Talking SDK
const AfricasTalking = require('africastalking')({
  apiKey: CONFIG.SMS_API_KEY,
  username: CONFIG.SMS_USERNAME,
});

// Initialize SMS service
const sms = AfricasTalking.SMS;

const STORAGE_KEY = '@visionally_trusted_contacts';

export const SmsService = {
  /**
   * Get trusted contacts from local storage
   */
  getTrustedContacts: async () => {
    try {
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      if (localData) {
        const contacts = JSON.parse(localData);
        return contacts;
      }
      return [];
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  },

  /**
   * Format phone number to international format
   * Africa's Talking requires international format: +27XXXXXXXXX
   */
  formatPhoneNumber: (phone) => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If number starts with 0, replace with 27
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    }
    
    // If number doesn't start with country code, add 27
    if (!cleaned.startsWith('27') && !cleaned.startsWith('+27')) {
      cleaned = '27' + cleaned;
    }
    
    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  },

  /**
   * Send emergency SMS to all trusted contacts
   */
  sendEmergencySMSToContacts: async (alertData) => {
    try {
      const contacts = await SmsService.getTrustedContacts();
      
      if (contacts.length === 0) {
        console.log('No trusted contacts found');
        return {
          success: false,
          message: 'No trusted contacts configured. Please add contacts first.',
        };
      }

      // Format all phone numbers to international format
      const recipients = contacts.map(contact => 
        SmsService.formatPhoneNumber(contact.phone)
      );

      // Create SMS message
      const smsMessage = `This is an automated alert. VisionAlly`;

      // Send SMS using Africa's Talking SDK
      const options = {
        to: recipients,
        message: smsMessage,
        enqueue: true,
      };

      console.log('Sending SMS to:', recipients);

      const response = await sms.send(options);
      
      console.log('SMS Response:', JSON.stringify(response, null, 2));

      // Check if SMS was sent successfully
      if (response.SMSMessageData && response.SMSMessageData.Recipients) {
        const recipients = response.SMSMessageData.Recipients;
        
        // Count successful sends
        const successCount = recipients.filter(r => 
          r.status === 'Success' || r.statusCode === 101
        ).length;
        
        const failCount = recipients.length - successCount;

        // Calculate total cost
        let totalCost = 0;
        recipients.forEach(r => {
          if (r.cost) {
            const costValue = parseFloat(r.cost.replace(/[^\d.]/g, ''));
            totalCost += costValue;
          }
        });

        if (successCount > 0) {
          let message = `Emergency SMS sent to ${successCount} contact${successCount > 1 ? 's' : ''}`;
          if (failCount > 0) {
            message += ` (${failCount} failed)`;
          }
          if (totalCost > 0) {
            message += ` - Cost: R${totalCost.toFixed(2)}`;
          }
          
          return {
            success: true,
            message,
            sentCount: successCount,
            failedCount: failCount,
            cost: totalCost,
            details: response,
          };
        } else {
          return {
            success: false,
            message: 'Failed to send SMS to any contacts.',
            details: response,
          };
        }
      } else {
        console.error('Unexpected SMS response format:', response);
        return {
          success: false,
          message: 'Failed to send SMS. Please try again.',
          details: response,
        };
      }
    } catch (error) {
      console.error('Error sending emergency SMS:', error);
      
      let errorMessage = 'An error occurred while sending SMS alerts.';
      if (error.message) {
        errorMessage += ` Error: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message,
      };
    }
  },

  /**
   * Check account balance (Production only)
   */
  checkBalance: async () => {
    try {
      const application = AfricasTalking.APPLICATION;
      const response = await application.fetchApplicationData();
      
      return {
        success: true,
        balance: response.UserData.balance,
        currency: 'ZAR',
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return {
        success: false,
        message: 'Failed to check balance',
        error: error.message,
      };
    }
  },
};

export default SmsService;