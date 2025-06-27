import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { validateNotificationRequest, validateApiKey, rateLimit } from '../middleware/validation';

const router = Router();

// Aplicar middlewares globales
router.use(validateApiKey);
router.use(rateLimit);

// Rutas principales
router.post('/send', validateNotificationRequest, (req, res) =>
  notificationController.sendNotification(req, res)
);

router.get('/health', (req, res) =>
  notificationController.getHealth(req, res)
);

// Corregir la ruta problemática - cambiar el orden de los parámetros
router.get('/status/:provider/:messageId', (req, res) =>
  notificationController.getMessageStatus(req, res)
);

// Alternativa más explícita si sigue dando problemas:
// router.get('/status', async (req, res) => {
//   const { provider, messageId } = req.query;
//   req.params = { provider: provider as string, messageId: messageId as string };
//   return notificationController.getMessageStatus(req, res);
// });

router.post('/validate-phone', (req, res) =>
  notificationController.validatePhone(req, res)
);

export default router;