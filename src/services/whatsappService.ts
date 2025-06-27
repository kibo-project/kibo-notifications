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
      logger.info('Twilio WhatsApp inicializado correctamente');
    } else {
      logger.warn('Credenciales de Twilio no encontradas');
    }
  }

  async sendWhatsApp(options: WhatsAppOptions) {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio WhatsApp no está configurado');
    }

    const { to, message, templateId, variables } = options;

    // Formatear el número de teléfono
    const formattedTo = this.formatPhoneNumber(to);

    // Formatear el mensaje con variables si existen
    const formattedMessage = this.formatMessage(message, variables);

    try {
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${formattedTo}`,
        body: formattedMessage,
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio'
      };
    } catch (error: any) {
      logger.error('Error enviando WhatsApp con Twilio', { error: error.message });
      throw new Error(`Error de Twilio: ${error.message}`);
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Limpiar el número de teléfono
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Agregar código de país si no lo tiene
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
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

  async getMessageStatus(messageId: string) {
    if (!this.client) {
      throw new Error('Twilio WhatsApp no está configurado');
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
      logger.error('Error obteniendo status del mensaje', { error: error.message, messageId });
      throw new Error(`Error obteniendo status: ${error.message}`);
    }
  }

  validatePhoneNumber(phone: string): { isValid: boolean; formatted?: string; error?: string } {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;

      if (!phoneRegex.test(cleanPhone)) {
        return {
          isValid: false,
          error: 'Formato de número de teléfono inválido'
        };
      }

      const formatted = this.formatPhoneNumber(cleanPhone);

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

  // Método para verificar si el servicio está disponible
  isAvailable(): boolean {
    return !!(this.client && this.fromNumber);
  }
}

export const whatsappService = new WhatsAppService();