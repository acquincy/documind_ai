export type WebhookEvent = 'document_uploaded' | 'document_summarized';

export interface WebhookPayload {
  event: WebhookEvent;
  fileName: string;
  fileSize: number;
  timestamp: string;
  documentContent?: string; // base64 string
  summaryData?: string;
}

/**
 * Sends a webhook payload to the configured VITE_WEBHOOK_URL.
 * If the URL is not set in the environment variables, this is a no-op.
 */
export async function sendWebhook(payload: WebhookPayload) {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
  
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }

    console.log(`Webhook sent successfully for event: ${payload.event}`);
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}
