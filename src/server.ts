import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', true);

// Logger setup
let logger: any;
try {
  const loggerModule = require('./utils/logger');
  logger = loggerModule.logger;
} catch (error) {
  console.error('Error loading logger:', error);
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
  };
}

// Routes
try {
  const notificationRoutes = require('./routes/notificationRoutes');
  app.use('/api/notifications', notificationRoutes.default || notificationRoutes);
} catch (error) {
  console.error('Error loading routes:', error);
}

// Health endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'Kibo Notifications Service',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);

    logger.info(`Server started on port ${PORT}`);
    logger.info('Email providers:', {
      resend: !!process.env.RESEND_API_KEY,
      gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
    });
    logger.info('WhatsApp provider:', {
      twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    });
  });
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server...');
  logger.info('SIGTERM received, shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server...');
  logger.info('SIGINT received, shutting down server...');
  process.exit(0);
});

export default app;