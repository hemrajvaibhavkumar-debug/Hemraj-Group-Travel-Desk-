import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.code === 429)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export function getSimulatedData(fileType: string) {
  if (fileType === "ticket") {
    return {
      pnr: "BOM" + Math.floor(1000 + Math.random() * 9000) + "DEL",
      travelerName: "Satish Sharma",
      travelDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
      origin: "Mumbai (BOM)",
      destination: "Delhi (DEL)",
      finalAmount: Number((11500 + Math.random() * 1000).toFixed(2)),
      currency: "INR"
    };
  } else if (fileType === "gst_invoice") {
    return {
      vendorName: "IndiGo Airlines (InterGlobe Aviation Ltd)",
      invoiceNumber: "6E/DEL/GST/" + Math.floor(100000 + Math.random() * 900000),
      totalBillAmount: Number((14800 + Math.random() * 1500).toFixed(2)),
      currency: "INR",
      invoiceDate: new Date().toISOString().split("T")[0],
      gstNumber: "07AAACI8451M1ZT",
      gstAmount: 740.00
    };
  } else if (fileType === "id_document") {
    return {
      name: "Arjun Malhotra",
      passportNumber: "Z9876543",
      passportIssueDate: "2020-04-12",
      passportExpiryDate: "2030-04-11",
      aadharPanNumber: "987654321012"
    };
  } else {
    return {
      vendorName: "MakeMyTrip Ltd",
      invoiceNumber: "MMT/INV/" + Math.floor(10000 + Math.random() * 90000),
      totalBillAmount: Number((13500 + Math.random() * 1500).toFixed(2)),
      currency: "INR",
      invoiceDate: new Date().toISOString().split("T")[0],
      gstNumber: "27AAACM4835A1Z5"
    };
  }
}

function parseSafeJson(text: string): any {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        throw new Error("Failed to parse JSON content from model output.");
      }
    }
    throw err;
  }
}

export async function processDocumentOcr(fileType: string, cleanMimeType: string, cleanedData: string, prompt: string): Promise<any> {
  const openRouterKey = env.OPENROUTER_API_KEY;

  if (openRouterKey) {
    const dataUrl = `data:${cleanMimeType};base64,${cleanedData}`;
    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    };

    const response = await retryWithBackoff(async () => {
      const resObj = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Hemraj Personal Travel Desk"
        },
        body: JSON.stringify(payload)
      });
      if (resObj.status === 429) {
        const err = new Error("Rate limited") as any;
        err.status = 429;
        throw err;
      }
      return resObj;
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API failed with status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const rawText = responseData.choices?.[0]?.message?.content || "{}";
    return parseSafeJson(rawText);
  } else if (env.GEMINI_API_KEY) {
    const imagePart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanedData
      }
    };
    const textPart = { text: prompt };

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts: [imagePart, textPart] },
    }));

    const rawText = response.text || "{}";
    return parseSafeJson(rawText);
  } else {
    return getSimulatedData(fileType);
  }
}
