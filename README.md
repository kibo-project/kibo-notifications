# Kibo Notifications Service

A robust notification service for sending emails and WhatsApp messages with multiple providers, built with Node.js, Express, and TypeScript.

## 🚀 Features

- **Email Support**: Resend and Gmail providers
- **WhatsApp Support**: Twilio integration
- **Security**: API Key authentication, rate limiting, CORS protection
- **Validation**: Comprehensive request validation middleware
- **Logging**: Structured logging system with Winston
- **Health Monitoring**: Service health endpoints with provider status
- **Template Support**: Variable substitution for dynamic messages
- **Phone Validation**: International phone number validation
- **Message Status Tracking**: Real-time message delivery status

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/kibo-notifications-service.git
cd kibo-notifications-service

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your environment variables
```

## ⚙️ Configuration

### Required Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# API Security
API_KEY=your-super-secret-api-key-here
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com

# Email Providers (at least one required)
RESEND_API_KEY=your-resend-api-key
# OR
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# WhatsApp Provider (optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=whatsapp:+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🛠️ Development

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## 📚 API Documentation

### Authentication
All endpoints require API key authentication via header:
```
x-api-key: your-super-secret-api-key-here
```

### Base URL
```
http://localhost:3001/api/notifications
```

---

## 📧 Email Endpoints

### Send Email
Send emails with support for HTML content and template variables.

**Endpoint:** `POST /send-email`

**Headers:**
```
Content-Type: application/json
x-api-key: your-super-secret-api-key-here
```

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Test Email",
  "message": "Plain text message",
  "html": "<p><strong>HTML</strong> message with <em>formatting</em></p>",
  "variables": {
    "name": "John",
    "order": "#12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_123456",
    "provider": "resend",
    "sentAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:3001/api/notifications/send-email' \
--header 'Content-Type: application/json' \
--header 'x-api-key: your_secure_api_key_here' \
--data '{
  "to": "user@example.com",
  "subject": "Test Email",
  "message": "This is a test email from cURL",
  "html": "<p><strong>Email</strong> test from <em>cURL</em></p>"
}'
```

---

## 📱 WhatsApp Endpoints

### Send WhatsApp Message
Send WhatsApp messages with template variable support.

**Endpoint:** `POST /send-whatsapp`

**Headers:**
```
Content-Type: application/json
x-api-key: your-super-secret-api-key-here
```

**Request Body:**
```json
{
  "to": "+1234567890",
  "message": "Hello {{name}}! Your order {{order}} has been confirmed.",
  "templateId": "order_confirmation",
  "variables": {
    "name": "John",
    "order": "#12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "wa_123456",
    "provider": "twilio",
    "to": "+1234567890",
    "status": "sent",
    "sentAt": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:3001/api/notifications/send-whatsapp' \
--header 'Content-Type: application/json' \
--header 'x-api-key: your_secure_api_key_here' \
--data '{
  "to": "+59171487844",
  "message": "¡Hola {{nombre}}! Tu pedido {{pedido}} ha sido confirmado.",
  "variables": {
    "nombre": "Juan",
    "pedido": "#12345"
  }
}'
```

### Get Message Status
Check the delivery status of a WhatsApp message.

**Endpoint:** `GET /message-status/:messageId`

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "wa_123456",
    "status": "delivered",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🔧 Utility Endpoints

### Validate Phone Number
Validate and format international phone numbers.

**Endpoint:** `POST /validate-phone`

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "formatted": "+1234567890",
    "country": "US"
  }
}
```

### Health Check
Check the health status of all services.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "WhatsApp",
    "status": "available",
    "provider": "twilio",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Services Status
Get the availability status of all notification services.

**Endpoint:** `GET /services`

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "available": true,
      "provider": "resend"
    },
    "whatsapp": {
      "available": true,
      "provider": "twilio"
    }
  }
}
```

### Legacy Send Notification
Generic notification endpoint (supports both email and WhatsApp).

**Endpoint:** `POST /send`

**Request Body (Email):**
```json
{
  "type": "email",
  "to": "user@example.com",
  "subject": "Subject",
  "message": "Message content",
  "provider": "resend"
}
```

**Request Body (WhatsApp):**
```json
{
  "type": "whatsapp",
  "to": "+1234567890",
  "message": "WhatsApp message"
}
```

---

## 🏗️ Project Structure

```
kibo-notifications-service/
├── src/
│   ├── controllers/
│   │   └── notificationController.ts
│   ├── middleware/
│   │   └── validation.ts
│   ├── routes/
│   │   └── notificationRoutes.ts
│   ├── services/
│   │   ├── emailService.ts
│   │   └── whatsappService.ts
│   ├── utils/
│   │   └── logger.ts
│   └── server.ts
├── .env.example
├── package.json
└── README.md
```

## 📊 Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid API key)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (provider unavailable)
