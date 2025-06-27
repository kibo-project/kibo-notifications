import { Request, Response, NextFunction } from 'express';
import { NotificationRequest } from '../types/notification';
import { logger } from '../utils/logger';

export const validateNotificationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { type, recipient, message, subject }: NotificationRequest = req.body;

    // Validaciones básicas
    if (!type || !recipient || !message) {
      res.status(400).json({
        success: false,
        error: 'Campos requeridos: type, recipient, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validar tipo
    if (!['email', 'whatsapp', 'both'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'type debe ser: email, whatsapp o both',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Para email, subject es requerido
    if ((type === 'email' || type === 'both') && !subject) {
      res.status(400).json({
        success: false,
        error: 'subject es requerido para emails',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validar formato de email si es email
    if ((type === 'email' || type === 'both')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Validar número de teléfono si es WhatsApp
    if ((type === 'whatsapp' || type === 'both')) {
      const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;
      const cleanPhone = recipient.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        res.status(400).json({
          success: false,
          error: 'Formato de número de teléfono inválido',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Validar longitud del mensaje
    if (message.length > 1600) { // Límite de WhatsApp
      res.status(400).json({
        success: false,
        error: 'El mensaje es demasiado largo (máximo 1600 caracteres)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('Request validado correctamente', {
      type,
      recipient: type === 'email' ? recipient : '***masked***'
    });

    next();
  } catch (error) {
    logger.error('Error en validación', { error });
    res.status(500).json({
      success: false,
      error: 'Error interno de validación',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware para validar API Key (opcional)
export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = process.env.API_KEY;

  // Si no hay API key configurada, permitir acceso
  if (!apiKey) {
    next();
    return;
  }

  const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!providedKey || providedKey !== apiKey) {
    logger.warn('Intento de acceso con API key inválida', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(401).json({
      success: false,
      error: 'API key requerida o inválida',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

// Middleware para rate limiting básico (en memoria)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10; // 10 requests por minuto por IP

export const rateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = req.ip || 'unknown';
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    next();
    return;
  }

  const data = requestCounts.get(ip);

  if (now > data.resetTime) {
    // Reset contador
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    next();
    return;
  }

  if (data.count >= MAX_REQUESTS) {
    logger.warn('Rate limit excedido', { ip, count: data.count });
    res.status(429).json({
      success: false,
      error: 'Demasiadas requests. Intenta más tarde.',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil((data.resetTime - now) / 1000)
    });
    return;
  }

  data.count++;
  requestCounts.set(ip, data);
  next();
};