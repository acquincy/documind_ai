export type WebhookEvent = 'document_uploaded';

export interface WebhookPayload {
  event: WebhookEvent;
  file: File;
  userId: string;
}

/**
 * Sends a webhook payload to the configured VITE_WEBHOOK_URL.
 * If the URL is not set in the environment variables, it throws an error.
 */
export async function sendWebhook(payload: WebhookPayload) {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error("Webhook URL is not configured. Please add VITE_WEBHOOK_URL to your .env file and restart your local server.");
  }

  // Create a FormData object. Using FormData natively bypasses many CORS preflight 
  // restrictions that often block JSON webhook requests from the browser, 
  // and allows handling large files without base64 memory overhead.
  const formData = new FormData();
  
  const now = new Date();
  
  formData.append('event', payload.event);
  formData.append('userId', payload.userId);
  formData.append('timestamp', now.toISOString()); // ISO formatted time
  formData.append('date', now.toLocaleDateString()); // Human readable date
  
  // File metadata
  formData.append('fileName', payload.file.name);
  formData.append('fileType', payload.file.type);
  formData.append('fileSize', payload.file.size.toString());
  
  // The actual file binary
  formData.append('file', payload.file); 

  // Important: We don't set the 'Content-Type' header manually! 
  // The browser automatically sets it to 'multipart/form-data; boundary=...'
  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with HTTP status: ${response.status}. Ensure your endpoint accepts POST multipart/form-data files.`);
  }

  console.log(`Webhook sent successfully for event: ${payload.event}`);
}
