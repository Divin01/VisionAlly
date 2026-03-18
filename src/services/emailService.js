import CONFIG from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const STORAGE_KEY = '@visionally_trusted_contacts';

export const EmailService = {
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
   * Send emergency alert to all trusted contacts
   */
  sendEmergencyAlertToContacts: async (alertData) => {
    try {
      const contacts = await EmailService.getTrustedContacts();
      
      if (contacts.length === 0) {
        console.log('No trusted contacts found');
        return {
          success: false,
          message: 'No trusted contacts configured. Please add contacts first.',
        };
      }

      // Prepare recipients list
      const recipients = contacts.map(contact => ({
        email: contact.email,
        name: contact.name,
      }));

      // Create professional email content following best practices
      const emailContent = {
        personalizations: [
          {
            to: recipients,
            subject: 'Job Interview Update - VisionAlly Notification',
          }
        ],
        from: {
          email: 'divinmathems58@gmail.com',
          name: 'VisionAlly Interview Coach'
        },
        reply_to: {
          email: 'divinmathems58@gmail.com',
          name: 'VisionAlly Support'
        },
        content: [
          {
            type: 'text/plain',
            value: `INTERVIEW UPDATE FROM VISIONALLY

This is an automated notification from your interview coach.

Alert Details:
Name: ${alertData.userName}
Phone: ${alertData.userPhone || 'Not provided'}
Location: ${alertData.location}
Time: ${alertData.timestamp}

${alertData.userName} has submitted their profile for job matching.

IMPORTANT: For real-time interview coaching, please download the VisionAlly mobile app and login to access live feedback during your interviews. This will allow you to receive instant guidance on ${alertData.userName}'s verbal and non-verbal communication.

If you need assistance, please visit www.visionally.co.za

This is an automated message from VisionAlly - Your Employment Ally.
Please do not reply to this email.

VisionAlly Team
www.visionally.co.za`
          },
          {
            type: 'text/html',
            value: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Interview Update - VisionAlly</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }
    p, h1, h2, h3, h4, h5, h6 {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #DC2626; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; padding: 0;">EMERGENCY ALERT</h1>
              <p style="color: #ffffff; font-size: 14px; margin: 8px 0 0 0; padding: 0;">Immediate Response Required</p>
            </td>
          </tr>
          
          <!-- Alert Notice -->
          <tr>
            <td style="padding: 30px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px;">
                    <p style="color: #991B1B; font-size: 14px; line-height: 1.6; margin: 0;">
                      <strong>ALERT:</strong> A job application notification has been triggered through VisionAlly. A person you know may need feedback.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Alert Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="color: #111827; font-size: 18px; margin: 0 0 20px 0;">Alert Details</h2>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="120" style="color: #6B7280; font-size: 14px; font-weight: 600;">Name:</td>
                        <td style="color: #111827; font-size: 14px;">${alertData.userName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="120" style="color: #6B7280; font-size: 14px; font-weight: 600;">Phone:</td>
                        <td style="color: #111827; font-size: 14px;">${alertData.userPhone || 'Not provided'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="120" style="color: #6B7280; font-size: 14px; font-weight: 600;">Location:</td>
                        <td style="color: #111827; font-size: 14px;">${alertData.location}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="120" style="color: #6B7280; font-size: 14px; font-weight: 600;">Time:</td>
                        <td style="color: #111827; font-size: 14px;">${alertData.timestamp}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Important Information -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #F3F4F6; padding: 20px;">
                    <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0;">Real-Time Location Tracking</h3>
                    <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0;">
                      For accurate real-time interview coaching, please download the VisionAlly mobile app and login with your account. This will enable you to receive instant feedback and support for <strong>${alertData.userName}</strong>'s job interviews.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Emergency Contact -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #DBEAFE; padding: 16px; text-align: center;">
                    <p style="color: #1E40AF; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                      If this is a critical emergency, contact authorities immediately:
                    </p>
                    <p style="color: #1E3A8A; font-size: 18px; font-weight: bold; margin: 0;">
                      SAPS Emergency: 10111
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">VisionAlly</p>
                    <p style="color: #6B7280; font-size: 12px; margin: 0 0 12px 0;">Your Safety Companion</p>
                    <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
          }
        ],
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        },
        mail_settings: {
          bypass_list_management: {
            enable: false
          },
          footer: {
            enable: false
          },
          sandbox_mode: {
            enable: false
          }
        }
      };

      const response = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.MAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent),
      });

      if (response.ok || response.status === 202) {
        console.log('Emergency emails sent successfully to', contacts.length, 'contacts');
        return {
          success: true,
          message: `Emergency alert sent to ${contacts.length} trusted contact${contacts.length > 1 ? 's' : ''}`,
          contactCount: contacts.length,
        };
      } else {
        const errorText = await response.text();
        console.error('SendGrid API Error:', response.status, errorText);
        return {
          success: false,
          message: 'Failed to send emergency alerts. Please try again.',
        };
      }
    } catch (error) {
      console.error('Error sending emergency emails:', error);
      return {
        success: false,
        message: 'An error occurred while sending alerts.',
      };
    }
  }
};

export default EmailService;