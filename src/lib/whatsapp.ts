import { supabase } from './supabase';
import { Socio } from '../types';

export interface WhatsAppConfig {
  id?: string;
  sucursal_id: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  system_phone?: string;
}

export interface WhatsAppLog {
  id?: string;
  socio_id: string;
  message_type: 'expiry' | 'absence' | 'custom';
  send_mode: 'auto' | 'manual';
  status: 'sent' | 'failed' | 'read' | 'delivered';
  message_text: string;
  sent_at?: string;
  error_message?: string;
  meta_message_id?: string;
  sucursal_id: string;
}

/**
 * Generates a standard wa.me link for manual sending
 */
export const generateManualWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
};

/**
 * Logs a WhatsApp communication attempt to the database
 */
export const logWhatsAppMessage = async (log: WhatsAppLog) => {
  const { error } = await supabase
    .from('whatsapp_logs')
    .insert([{ ...log, sent_at: new Date().toISOString() }]);
  
  if (error) {
    console.error('Error logging WhatsApp message:', error);
  }
};

/**
 * Sends an automated message using Meta WhatsApp Business API
 * Note: Requires pre-approved templates from Meta
 */
export const sendAutoWhatsAppMessage = async (
  config: WhatsAppConfig,
  socio: Socio,
  templateName: string,
  parameters: any[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!socio.telefono) {
    return { success: false, error: 'Socio has no phone number' };
  }

  const url = `https://graph.facebook.com/v17.0/${config.phone_number_id}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: socio.telefono.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es' },
          components: parameters.map(p => ({
            type: 'text',
            text: p
          }))
        }
      })
    });

    const result = await response.json();

    if (response.ok && result.messages) {
      return { success: true, messageId: result.messages[0].id };
    } else {
      return { success: false, error: result.error?.message || 'Unknown Meta API error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
};
