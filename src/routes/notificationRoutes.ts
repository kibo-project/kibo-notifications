import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { validateNotificationRequest, validateApiKey, rateLimit } from '../middleware/validation';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';

const router = Router();

// Aplicar middlewares globales
router.use(validateApiKey);
router.use(rateLimit);

// Rutas principales
router.post('/send', validateNotificationRequest, (req, res) =>
  notificationController.sendNotification(req, res)
);

// Nueva ruta específica para envío de emails
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, message, html, variables } = req.body;

    // Validar campos requeridos
    if (!to || !subject || (!message && !html)) {
      res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: to, subject y (message o html)'
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
      return;
    }

    // Verificar si el servicio está disponible
    if (!emailService.isAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Servicio de email no disponible'
      });
      return;
    }

    // Enviar email
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

router.get('/health', (req, res) =>
  notificationController.getHealth(req, res)
);

// Corregir la ruta problemática - cambiar el orden de los parámetros
router.get('/status/:provider/:messageId', (req, res) =>
  notificationController.getMessageStatus(req, res)
);

router.post('/validate-phone', (req, res) =>
  notificationController.validatePhone(req, res)
);

console.log('✅ Ruta /send-email configurada');
console.log('✅ Ruta /test configurada');

export default router;