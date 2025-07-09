# Kibo Notifications Service

Servicio de notificaciones para envío de emails y mensajes de WhatsApp con múltiples proveedores.

## 🚀 Características

- **Email**: Resend y Gmail
- **WhatsApp**: Twilio
- **Seguridad**: API Key, Rate limiting, CORS
- **Validación**: Middleware de validación robusto
- **Logging**: Sistema de logs estructurado
- **Health Check**: Endpoint de salud con estado de proveedores

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Configurar variables de entorno en .env
```

## ⚙️ Configuración

### Variables de entorno requeridas:

```env
# API Key para autenticación
API_KEY=your-super-secret-api-key

# Al menos uno de los proveedores de email
RESEND_API_KEY=your-resend-key
# O
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Para WhatsApp (opcional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

## 🛠️ Desarrollo

```bash
# Desarrollo con hot reload
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## 📚 API Endpoints

### Enviar notificación
```
POST /api/notifications/send
Headers: x-api-key: your-api-key
```

**Email:**
```json
{
  "type": "email",
  "to": "user@example.com",
  "subject": "Asunto del email",
  "message": "Contenido del mensaje",
  "provider": "resend"
}
```

**WhatsApp:**
```json
{
  "type": "whatsapp",
  "to": "+1234567890",
  "message": "Mensaje de WhatsApp"
}
```

### Health Check
```
GET /api/notifications/health
```

### Estado de mensaje
```
GET /api/notifications/status/:provider/:messageId
```

### Validar teléfono
```
POST /api/notifications/validate-phone
{
  "phone": "+1234567890"
}
```

## 🔧 Estructura del proyecto