import { Request, Response } from 'express';
import { NotificationRequest, NotificationResponse } from '../types/notification';
import { emailService } from '../services/emailService';
import { whatsappService } from '../services/whatsappService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class NotificationController {

  async sendNotification(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const {
        type,
        recipient,
        message,
        subject,
        templateId,
        variables,
        priority = 'normal'
      }: NotificationRequest = req.body;

      logger.info('Processing notification', {
        requestId,
        type,
        recipient: type === 'email' ? recipient : '***masked***',
        priority
      });

      const results: NotificationResponse['results'] = {};

      if (type === 'email' || type === 'both') {
        try {
          const emailResult = await emailService.sendEmail({
            to: recipient,
            subject: subject!,
            message,
            templateId,
            variables
          });

          results.email = {
            success: true,
            messageId: emailResult.messageId
          };
        } catch (error: any) {
          logger.error('Error sending email', { requestId, error: error.message });
          results.email = {
            success: false,
            error: error.message
          };
        }
      }

      if (type === 'whatsapp' || type === 'both') {
        try {
          const whatsappResult = await whatsappService.sendWhatsApp({
            to: recipient,
            message,
            templateId,
            variables
          });

          results.whatsapp = {
            success: true,
            messageId: whatsappResult.messageId
          };
        } catch (error: any) {
          logger.error('Error sending WhatsApp', { requestId, error: error.message });
          results.whatsapp = {
            success: false,
            error: error.message
          };
        }
      }

      const hasSuccess = Object.values(results).some(result => result.success);
      const processingTime = Date.now() - startTime;

      const response: NotificationResponse = {
        success: hasSuccess,
        results,
        timestamp: new Date().toISOString(),
        requestId
      };

      logger.info('Notification processed', {
        requestId,
        success: hasSuccess,
        processingTime: `${processingTime}ms`,
        results: Object.keys(results).reduce((acc, key) => {
          acc[key] = results[key as keyof typeof results]?.success || false;
          return acc;
        }, {} as Record<string, boolean>)
      });

      res.status(hasSuccess ? 200 : 500).json(response);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing notification', {
        requestId,
        error: error.message,
        processingTime: `${processingTime}ms`
      });

      res.status(500).json({
        success: false,
        results: {},
        timestamp: new Date().toISOString(),
        requestId,
        error: 'Internal server error'
      });
    }
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          email: emailService.isAvailable(),
          whatsapp: whatsappService.isAvailable()
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };

      res.json(health);

    } catch (error: any) {
      logger.error('Error in health check', { error: error.message });
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  async getMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { messageId, provider } = req.params;

      if (provider === 'whatsapp') {
        const status = await whatsappService.getMessageStatus(messageId);
        res.json({
          success: true,
          data: status,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Provider not supported for status check',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error('Error getting message status', {
        messageId: req.params.messageId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async validatePhone(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;

      if (!phone) {
        res.status(400).json({
          success: false,
          error: 'Phone number required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const validation = whatsappService.validatePhoneNumber(phone);

      res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error validating phone', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const notificationController = new NotificationController();