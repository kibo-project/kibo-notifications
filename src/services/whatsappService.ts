import twilio from 'twilio';
import { WhatsAppOptions } from '../types/notification';
import { logger } from '../utils/logger';

class WhatsAppService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || null;
      logger.info('Twilio WhatsApp initialized successfully');
    } else {
      logger.error('Twilio credentials not found');
    }
  }

  async sendWhatsApp(options: WhatsAppOptions) {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio WhatsApp is not configured properly');
    }

    const { to, message, variables } = options;

    const phoneValidation = this.validatePhoneNumber(to);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid phone number: ${phoneValidation.error}`);
    }

    const formattedTo = phoneValidation.formatted!;
    const formattedMessage = this.formatMessage(message, variables);

    try {
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${formattedTo}`,
        body: formattedMessage,
      });

      logger.info('WhatsApp sent successfully', {
        messageId: result.sid,
        to: formattedTo,
        status: result.status
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        status: result.status,
        to: formattedTo
      };

    } catch (error: any) {
      logger.error('Error sending WhatsApp', {
        error: error.message,
        code: error.code,
        status: error.status,
        to: formattedTo
      });

      const errorMessage = this.handleTwilioError(error, formattedTo);
      throw new Error(errorMessage);
    }
  }

  private handleTwilioError(error: any, phoneNumber: string): string {
    switch (error.code) {
      case 21211:
        return `Invalid phone number: ${phoneNumber}`;
      case 21408:
        return 'Insufficient permissions to send WhatsApp messages';
      case 63016:
        return `Number not registered in WhatsApp sandbox: ${phoneNumber}. You need to register the number first by sending "join <code>" to +1 415 523 8886`;
      case 21606:
        return 'Origin number is not verified for WhatsApp';
      default:
        return `Twilio error (${error.code}): ${error.message}`;
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('591')) {
        cleanPhone = '+' + cleanPhone;
      } else if (cleanPhone.length === 8) {
        cleanPhone = '+591' + cleanPhone;
      } else {
        cleanPhone = '+' + cleanPhone;
      }
    }

    return cleanPhone;
  }

  private formatMessage(message: string, variables?: Record<string, any>): string {
    if (!variables) return message;

    let formattedMessage = message;
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      formattedMessage = formattedMessage.replace(
        new RegExp(placeholder, 'g'),
        variables[key]
      );
    });

    return formattedMessage;
  }

  validatePhoneNumber(phone: string): { isValid: boolean; formatted?: string; error?: string } {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

      if (cleanPhone.length < 8) {
        return {
          isValid: false,
          error: 'Number too short'
        };
      }

      const formatted = this.formatPhoneNumber(cleanPhone);

      if (!/^\+\d{10,15}$/.test(formatted)) {
        return {
          isValid: false,
          error: 'Invalid format'
        };
      }

      return {
        isValid: true,
        formatted
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  async getMessageStatus(messageId: string) {
    if (!this.client) {
      throw new Error('Twilio WhatsApp is not configured');
    }

    try {
      const message = await this.client.messages(messageId).fetch();

      return {
        messageId: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error: any) {
      logger.error('Error getting message status', { error: error.message, messageId });
      throw new Error(`Error getting status: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return !!(this.client && this.fromNumber);
  }
}

export const whatsappService = new WhatsAppService();