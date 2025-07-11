import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { validateNotificationRequest, validateApiKey, rateLimit, validateEmailRequest } from '../middleware/validation';
import { emailService } from '../services/emailService';
import { whatsappService } from '../services/whatsappService';
import { logger } from '../utils/logger';

const router = Router();

router.use(validateApiKey);
router.use(rateLimit);

router.post('/send', validateNotificationRequest, (req, res) =>
  notificationController.sendNotification(req, res)
);

router.post('/send-email', validateEmailRequest, async (req, res) => {
  try {
    const { to, subject, message, html, variables } = req.body;

    if (!emailService.isAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Servicio de email no disponible'
      });
      return;
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      message,
      html,
      variables
    });

    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        provider: result.provider,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error en endpoint send-email', { error });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

router.post('/send-whatsapp', validateApiKey, async (req, res) => {
  try {
    const { to, message, templateId, variables } = req.body;

    logger.info('Procesando envío de WhatsApp', {
      to: to ? `${to.substring(0, 5)}...` : 'undefined',
      messageLength: message ? message.length : 0,
      hasTemplateId: !!templateId,
      hasVariables: !!variables
    });

    if (!to || !message) {
      logger.error('Campos requeridos faltantes', { to: !!to, message: !!message });
      res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: to, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (typeof to !== 'string' || typeof message !== 'string') {
      logger.error('Tipos de datos incorrectos', {
        toType: typeof to,
        messageType: typeof message
      });
      res.status(400).json({
        success: false,
        error: 'to y message deben ser strings',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const phoneValidation = whatsappService.validatePhoneNumber(to);
    if (!phoneValidation.isValid) {
      logger.error('Número de teléfono inválido', {
        to,
        error: phoneValidation.error
      });
      res.status(400).json({
        success: false,
        error: `Número de teléfono inválido: ${phoneValidation.error}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (message.length > 1600) {
      logger.error('Mensaje demasiado largo', {
        messageLength: message.length
      });
      res.status(400).json({
        success: false,
        error: 'El mensaje es demasiado largo (máximo 1600 caracteres)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (variables && typeof variables !== 'object') {
      logger.error('Variables con formato incorrecto', {
        variablesType: typeof variables
      });
      res.status(400).json({
        success: false,
        error: 'variables debe ser un objeto',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!whatsappService.isAvailable()) {
      logger.error('Servicio de WhatsApp no disponible');
      res.status(503).json({
        success: false,
        error: 'Servicio de WhatsApp no disponible. Verifica la configuración de Twilio.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await whatsappService.sendWhatsApp({
      to,
      message,
      templateId,
      variables
    });

    logger.info('WhatsApp enviado exitosamente', {
      messageId: result.messageId,
      to: phoneValidation.formatted,
      provider: result.provider
    });

    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        provider: result.provider,
        to: phoneValidation.formatted,
        status: result.status,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Error en endpoint send-whatsapp', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });

    if (error.message.includes('Twilio') || error.code) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/message-status/:messageId', validateApiKey, async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      res.status(400).json({
        success: false,
        error: 'messageId es requerido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const status = await whatsappService.getMessageStatus(messageId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Error obteniendo estado del mensaje', {
      error: error.message,
      messageId: req.params.messageId
    });

    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del mensaje',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const isAvailable = whatsappService.isAvailable();

    res.json({
      success: true,
      data: {
        service: 'WhatsApp',
        status: isAvailable ? 'available' : 'unavailable',
        provider: 'twilio',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Error en health check', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Error en health check',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/validate-phone', (req, res) =>
  notificationController.validatePhone(req, res)
);

router.get('/status/:provider/:messageId', (req, res) =>
  notificationController.getMessageStatus(req, res)
);

router.get('/health', (req, res) =>
  notificationController.getHealth(req, res)
);

router.get('/services', (req, res) => {
  try {
    const services = {
      email: {
        available: emailService.isAvailable(),
        provider: 'sendgrid' // o el proveedor que uses
      },
      whatsapp: {
        available: whatsappService.isAvailable(),
        provider: 'twilio'
      }
    };

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    logger.error('Error obteniendo servicios', { error });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

logger.info('✅ Rutas de notificaciones configuradas');

export default router;