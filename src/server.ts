import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando servidor...');

// Middlewares de seguridad
console.log('🔒 Configurando middlewares de seguridad...');
app.use(helmet());
console.log('✅ Helmet configurado');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
console.log('✅ CORS configurado');

// Middlewares de logging y parseo
console.log('📝 Configurando middlewares de logging...');
app.use(morgan('combined'));
console.log('✅ Morgan configurado');

app.use(express.json({ limit: '10mb' }));
console.log('✅ JSON parser configurado');

app.use(express.urlencoded({ extended: true }));
console.log('✅ URL encoded parser configurado');

// Middleware para confiar en proxies
console.log('🔧 Configurando trust proxy...');
app.set('trust proxy', true);
console.log('✅ Trust proxy configurado');

// Cargar rutas
console.log('🔍 Cargando rutas...');
try {
  const notificationRoutes = require('./routes/notificationRoutes');
  console.log('✅ Archivo de rutas cargado');

  app.use('/api/notifications', notificationRoutes.default || notificationRoutes);
  console.log('✅ Rutas de notificaciones montadas');
} catch (error) {
  console.error('❌ Error cargando rutas:', error);
  console.error('Stack:', error);
}

// Ruta raíz
console.log('🏠 Configurando ruta raíz...');
app.get('/', (req, res) => {
  res.json({
    name: 'Kibo Notifications Service',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Ruta raíz configurada');

// Ruta para health check básico
console.log('🏥 Configurando health check...');
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
console.log('✅ Health check configurado');

// Middleware de manejo de errores 404
console.log('🚫 Configurando middleware 404...');
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Middleware 404 configurado');

// Cargar logger de forma segura
console.log('📋 Cargando logger...');
let logger: any;
try {
  const loggerModule = require('./utils/logger');
  logger = loggerModule.logger;
  console.log('✅ Logger cargado exitosamente');
} catch (error) {
  console.error('❌ Error cargando logger:', error);
  // Logger fallback
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
  };
}

// Middleware de manejo de errores globales
console.log('🛡️ Configurando middleware de errores globales...');
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error no manejado', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Middleware de errores configurado');

// Iniciar servidor
console.log('🚀 Iniciando servidor en puerto', PORT);
app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado exitosamente en puerto ${PORT}`);

  logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
  logger.info('📧 Email providers:', {
    resend: !!process.env.RESEND_API_KEY,
    gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  });
  logger.info('📱 WhatsApp provider:', {
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  });
});

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM recibido, cerrando servidor...');
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT recibido, cerrando servidor...');
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});



export default app;