import { env } from "../config/env";

export async function sendWorkOrderWebhook(payload: any): Promise<boolean> {
  const webhookUrl = env.N8N_WORKORDER_WEBHOOK_URL || env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("n8n work order webhook URL is not configured. Webhook dispatch skipped.");
    return false;
  }

  try {
    console.log(`Dispatching work order details to n8n webhook: ${webhookUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error: any) {
    console.error("n8n work order webhook dispatch failed:", error.message);
    return false;
  }
}

export async function sendIndentWebhook(payload: any): Promise<boolean> {
  const webhookUrl = env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("n8n generic webhook URL is not configured. Webhook dispatch skipped.");
    return false;
  }

  try {
    console.log(`Dispatching travel indent details to n8n webhook: ${webhookUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error: any) {
    console.error("n8n indent webhook dispatch failed:", error.message);
    return false;
  }
}

export async function sendUploadWebhook(payload: {
  fileName: string;
  fileData: string;
  fileType?: string;
  documentCategory: string;
  folderPath?: string;
  resolvedFileName?: string;
}): Promise<{ success: boolean; url?: string }> {
  const webhookUrl = env.N8N_UPLOAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("n8n file upload webhook URL is not configured. Upload webhook skipped.");
    return { success: false };
  }

  try {
    console.log(`Routing file upload of kind "${payload.documentCategory}" to n8n upload webhook:`, payload.fileName);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: payload.fileName,
        fileData: payload.fileData, // base64 encoded
        fileType: payload.fileType,
        mimeType: payload.fileType || "application/octet-stream",
        documentCategory: payload.documentCategory,
        docKind: payload.documentCategory,
        folderPath: payload.folderPath || "",
        resolvedFileName: payload.resolvedFileName || "",
        uploadedAt: new Date().toISOString()
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      try {
        const resData = await response.json() as any;
        return {
          success: true,
          url: resData.url || resData.driveUrl || resData.webViewLink || undefined
        };
      } catch {
        return { success: true };
      }
    }
    return { success: false };
  } catch (error: any) {
    console.error("n8n file upload webhook dispatch failed:", error.message);
    return { success: false };
  }
}
