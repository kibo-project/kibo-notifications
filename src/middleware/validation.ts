import { Request, Response, NextFunction } from 'express';
import { NotificationRequest } from '../types/notification';
import { logger } from '../utils/logger';

export const validateEmailRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { to, subject, message, html, variables } = req.body;

    if (!to || !subject || (!message && !html)) {
      res.status(400).json({
        success: false,
        error: 'Required fields missing: to, subject and (message or html)'
      });
      return;
    }

    if (typeof to !== 'string' || typeof subject !== 'string') {
      res.status(400).json({
        success: false,
        error: 'to and subject must be strings'
      });
      return;
    }

    if (message && typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'message must be string'
      });
      return;
    }

    if (html && typeof html !== 'string') {
      res.status(400).json({
        success: false,
        error: 'html must be string'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
      return;
    }

    if (subject.length > 200) {
      res.status(400).json({
        success: false,
        error: 'Subject cannot exceed 200 characters'
      });
      return;
    }

    if (variables && typeof variables !== 'object') {
      res.status(400).json({
        success: false,
        error: 'variables must be an object'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in email validation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const validateWhatsAppRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { to, message, templateId, variables } = req.body;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: 'Required fields missing: to, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (typeof to !== 'string' || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'to and message must be strings',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;
    const cleanPhone = to.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (message.length > 1600) {
      res.status(400).json({
        success: false,
        error: 'Message is too long (maximum 1600 characters)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (templateId && typeof templateId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'templateId must be string',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (variables && typeof variables !== 'object') {
      res.status(400).json({
        success: false,
        error: 'variables must be an object',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (variables) {
      const varsCount = Object.keys(variables).length;
      if (varsCount > 10) {
        res.status(400).json({
          success: false,
          error: 'Too many variables (maximum 10)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      for (const [key, value] of Object.entries(variables)) {
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          res.status(400).json({
            success: false,
            error: `Variable '${key}' must be string, number or boolean`,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error in WhatsApp validation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      timestamp: new Date().toISOString()
    });
  }
};

export const validateTwilioWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];
    const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      next();
      return;
    }

    if (!twilioSignature) {
      res.status(401).json({
        success: false,
        error: 'Twilio signature required'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating Twilio webhook', { error });
    res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
};

export const logWhatsAppRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  const originalSend = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - startTime;

    logger.info('WhatsApp request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: data.success,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    return originalSend.call(this, data);
  };

  next();
};

export const validateNotificationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { type, recipient, message, subject }: NotificationRequest = req.body;

    if (!type || !recipient || !message) {
      res.status(400).json({
        success: false,
        error: 'Required fields: type, recipient, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!['email', 'whatsapp', 'both'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'type must be: email, whatsapp or both',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if ((type === 'email' || type === 'both') && !subject) {
      res.status(400).json({
        success: false,
        error: 'subject is required for emails',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if ((type === 'email' || type === 'both')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    if ((type === 'whatsapp' || type === 'both')) {
      const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;
      const cleanPhone = recipient.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        res.status(400).json({
          success: false,
          error: 'Invalid phone number format',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    if (message.length > 1600) {
      res.status(400).json({
        success: false,
        error: 'Message is too long (maximum 1600 characters)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in validation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      timestamp: new Date().toISOString()
    });
  }
};

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    logger.error('API_KEY not configured in environment variables');
    res.status(500).json({
      success: false,
      error: 'Incomplete server configuration',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (apiKey !== expectedApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export const optionalApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    next();
    return;
  }

  validateApiKey(req, res, next);
};

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

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
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    next();
    return;
  }

  if (data.count >= MAX_REQUESTS) {
    logger.warn('Rate limit exceeded', { ip, count: data.count });
    res.status(429).json({
      success: false,
      error: 'Too many requests. Try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil((data.resetTime - now) / 1000)
    });
    return;
  }

  data.count++;
  requestCounts.set(ip, data);
  next();
};