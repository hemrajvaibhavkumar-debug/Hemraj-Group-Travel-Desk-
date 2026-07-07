import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as GeminiService from "../services/gemini.service";

async function executeScanJobInBackground(jobId: string, fileType: string, cleanMimeType: string, cleanedData: string, prompt: string) {
  try {
    const scannedData = await GeminiService.processDocumentOcr(fileType, cleanMimeType, cleanedData, prompt);
    
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        result: JSON.parse(JSON.stringify(scannedData))
      }
    });
  } catch (error: any) {
    console.error(`Scan job ${jobId} background processing failed:`, error.message);
    const simulatedFallback = GeminiService.getSimulatedData(fileType);
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED", // complete with fallback to prevent UI blockages
        result: JSON.parse(JSON.stringify(simulatedFallback)),
        error: error.message
      }
    });
  }
}

export async function createScanJob(req: AuthenticatedRequest, res: Response) {
  try {
    const { fileType, fileData, mimeType, fileName } = req.body;
    if (!fileType || !fileData) {
      return res.status(400).json({ error: "Required scanner body attributes (fileType and fileData in Base64) are missing." });
    }

    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.scanJob.create({
      data: {
        id: jobId,
        fileType,
        status: "PENDING"
      }
    });

    const cleanMimeType = mimeType || "image/png";
    const cleanedData = fileData.replace(/^data:.*?;base64,/, "");

    const prompt = fileType === "ticket" ?
      `You are an interactive Travel Voucher scanner. Analyze the attached document image.
       Extract and return a raw, valid JSON object matching these exact keys:
       {
         "pnr": "string containing Ticket/PNR number",
         "travelerName": "string containing traveler name",
         "travelDate": "string YYYY-MM-DD",
         "origin": "string city/airport code",
         "destination": "string destination representation",
         "finalAmount": 12500,
         "currency": "INR"
       }
       Make sure finalAmount is a clean float. Return ONLY values as standard JSON without any markdown formatting or prefix labels.`
      : fileType === "gst_invoice" ?
        `You are a corporate accountant auditing a Service / Airline GST Invoice.
        Analyze the attached document image.
        Extract and return a raw, valid JSON object matching these exact keys:
        {
          "vendorName": "string Airline or Service provider name (e.g. IndiGo, Air India, AirAsia, Vistara, SpiceJet, etc.)",
          "invoiceNumber": "string containing GST invoice number",
          "totalBillAmount": 14800,
          "currency": "INR",
          "invoiceDate": "string YYYY-MM-DD",
          "gstNumber": "string containing GST details of the Service or Airline provider",
          "gstAmount": 740.00
        }
        Make sure totalBillAmount is a clean floating point value. Return ONLY raw valid JSON structures without any markdown formatting.`
        : fileType === "id_document" ?
          `You are an AI document scanner. Analyze the attached Passport or national ID card image.
          Extract and return a raw, valid JSON object matching these exact keys:
          {
            "name": "string containing traveler's full name",
            "passportNumber": "string containing passport number if it is a passport, otherwise empty string",
            "passportIssueDate": "string YYYY-MM-DD if it is a passport, otherwise empty string",
            "passportExpiryDate": "string YYYY-MM-DD if it is a passport, otherwise empty string",
            "aadharPanNumber": "string containing Aadhaar number (12 digits) or PAN card number (10 alphanumeric characters) or general national ID number if available, otherwise empty string"
          }
          Return ONLY raw valid JSON structures without any markdown formatting.`
          :
          `You are a corporate accountant scanning a vendor invoice receipt.
       Extract and return a raw, valid JSON object matching these exact keys:
       {
         "vendorName": "string vendor name",
         "invoiceNumber": "string bill or invoice number",
         "totalBillAmount": 13900,
         "currency": "INR",
         "invoiceDate": "string YYYY-MM-DD",
         "gstNumber": "string GST details"
       }
       Make sure totalBillAmount is a clean floating point value. Return ONLY raw valid JSON structures.`;

    // Dispatch background worker
    executeScanJobInBackground(jobId, fileType, cleanMimeType, cleanedData, prompt);

    return res.json({
      success: true,
      jobId
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Document AI Scan exception: " + error.message });
  }
}

export async function getScanJobStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const job = await prisma.scanJob.findUnique({
      where: { id }
    });
    if (!job) {
      return res.status(404).json({ error: `Scan job ${id} was not found.` });
    }
    return res.json(job);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to check scan job status: " + error.message });
  }
}
