export interface NotificationRequest {
  type: 'email' | 'whatsapp' | 'both';
  recipient: string;
  message: string;
  subject?: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface NotificationResponse {
  success: boolean;
  results: {
    email?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
    whatsapp?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
  };
  timestamp: string;
  requestId: string;
  error?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  message: string;
  html?: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface WhatsAppOptions {
  to: string;
  message: string;
  templateId?: string;
  variables?: Record<string, any>;
}