import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { EmailOptions } from '../types/notification';
import { logger } from '../utils/logger';

class EmailService {
  private resend: Resend | null = null;
  private nodemailerTransporter: any = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Inicializar Resend
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      logger.info('Resend inicializado correctamente');
    }

    // Inicializar Nodemailer como fallback
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.nodemailerTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      logger.info('Nodemailer inicializado correctamente');
    }
  }

  private async sendWithResend(options: EmailOptions) {
    if (!this.resend) {
      throw new Error('Resend no está configurado');
    }

    const { to, subject, message, html, variables } = options;

    const emailData = {
      from: process.env.FROM_EMAIL || 'noreply@localhost',
      to: [to],
      subject,
      html: html || this.formatMessage(message, variables),
    };

    const result = await this.resend.emails.send(emailData);

    if (result.error) {
      throw new Error(`Error de Resend: ${result.error.message}`);
    }

    return {
      success: true,
      messageId: result.data?.id,
      provider: 'resend'
    };
  }

  private async sendWithNodemailer(options: EmailOptions) {
    if (!this.nodemailerTransporter) {
      throw new Error('Nodemailer no está configurado');
    }

    const { to, subject, message, html, variables } = options;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: html || this.formatMessage(message, variables),
    };

    const result = await this.nodemailerTransporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
      provider: 'nodemailer'
    };
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

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          ${formattedMessage}
        </div>
      </div>
    `;
  }

  async sendEmail(options: EmailOptions) {
    try {
      logger.info('Enviando email', { to: options.to, subject: options.subject });

      // Intentar con Resend primero
      if (this.resend) {
        try {
          const result = await this.sendWithResend(options);
          logger.info('Email enviado exitosamente con Resend', { messageId: result.messageId });
          return result;
        } catch (error) {
          logger.warn('Error con Resend, intentando con Nodemailer', { error });
        }
      }

      // Fallback a Nodemailer
      if (this.nodemailerTransporter) {
        const result = await this.sendWithNodemailer(options);
        logger.info('Email enviado exitosamente con Nodemailer', { messageId: result.messageId });
        return result;
      }

      throw new Error('No hay proveedores de email configurados');

    } catch (error) {
      logger.error('Error enviando email', { error, options: { to: options.to, subject: options.subject } });
      throw error;
    }
  }

  // Método para verificar si el servicio está disponible
  isAvailable(): boolean {
    return !!(this.resend || this.nodemailerTransporter);
  }
}

export const emailService = new EmailService();