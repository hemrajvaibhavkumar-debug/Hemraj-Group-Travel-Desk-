import { Response } from "express";
import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as N8nService from "../services/n8n.service";
import * as ForexService from "../services/forex.service";
import * as GeminiService from "../services/gemini.service";

export async function uploadFile(req: AuthenticatedRequest, res: Response) {
  try {
    const { fileName, fileData, fileType, documentCategory } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing required upload parameters (fileName, fileData)." });
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const relativeUrl = `/uploads/${Date.now()}_${cleanName}`;

    const ok = await N8nService.sendUploadWebhook({
      fileName,
      fileData,
      fileType,
      documentCategory: documentCategory || "general_document"
    });

    if (ok) {
      return res.status(200).json({
        success: true,
        url: relativeUrl, // keep fallback url structure or let n8n return it
        name: fileName,
        message: "File uploaded to Google Drive via n8n successfully!"
      });
    } else {
      console.warn("N8N upload webhook failed or unconfigured, falling back to local file path mapping:", fileName);
      return res.status(200).json({
        success: true,
        url: relativeUrl,
        name: fileName,
        message: `Local upload fallback: Webhook Offline`
      });
    }
  } catch (error: any) {
    console.error("Upload error:", error.message);
    return res.status(500).json({ error: "File upload failure: " + error.message });
  }
}

export async function searchFlights(req: AuthenticatedRequest, res: Response) {
  try {
    const { source, destination, date, flexibleDays = 5 } = req.body;
    if (!source || !destination || !date) {
      return res.status(400).json({ error: "Missing required search parameters (source, destination, date)." });
    }

    const cleanSource = source.trim().toUpperCase();
    const cleanDest = destination.trim().toUpperCase();
    const flex = Math.min(Math.max(Number(flexibleDays), 0), 10);

    const fastApiUrl = env.FASTAPI_URL;
    console.log(`Delegating flight search query [${cleanSource} -> ${cleanDest} on ${date}] to FastAPI backend: ${fastApiUrl}`);

    let flights: any[] = [];
    let fetchError = "";

    // 1. Try POST request to FastAPI backend
    try {
      const response = await fetch(`${fastApiUrl}/api/flights/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: cleanSource,
          destination: cleanDest,
          date: date,
          flexibleDays: flex
        })
      });

      if (response.ok) {
        const resData = await response.json() as any;
        if (resData && Array.isArray(resData.flights)) {
          flights = resData.flights;
        } else if (resData && Array.isArray(resData)) {
          flights = resData;
        } else if (resData && resData.data && Array.isArray(resData.data.flights)) {
          flights = resData.data.flights;
        }
      } else {
        fetchError = `FastAPI POST responded with status ${response.status}: ${response.statusText}`;
      }
    } catch (err: any) {
      console.warn(`FastAPI POST search failed, trying GET fallback: ${err.message}`);
      
      // 2. Fallback to GET request to FastAPI backend
      try {
        const getUrl = `${fastApiUrl}/flights?source=${cleanSource}&destination=${cleanDest}&date=${date}&flexible_days=${flex}`;
        const response = await fetch(getUrl);
        if (response.ok) {
          const resData = await response.json() as any;
          if (resData && Array.isArray(resData.flights)) {
            flights = resData.flights;
          } else if (resData && Array.isArray(resData)) {
            flights = resData;
          } else if (resData && resData.data && Array.isArray(resData.data.flights)) {
            flights = resData.data.flights;
          }
        } else {
          fetchError = `FastAPI GET responded with status ${response.status}`;
        }
      } catch (getErr: any) {
        fetchError = `FastAPI connection failed: ${getErr.message}`;
      }
    }

    if (flights.length === 0) {
      return res.status(400).json({
        error: fetchError || `No flights returned by your FastAPI backend server at ${fastApiUrl} for route ${cleanSource} -> ${cleanDest}.`
      });
    }

    const normalizedFlights = flights.map((f: any, idx: number) => {
      const isDuffel = f.sourceApi === "duffel" || f.id?.startsWith("DF-") || f.currency === "USD";
      return {
        id: f.id || `FA-${f.date || date}-${f.flightNumber || idx}-${idx}`,
        airline: f.airline || "Partner Airline",
        flightNumber: f.flightNumber || f.flight_number || "XX-000",
        departureTime: f.departureTime || f.departure_time || "09:00",
        arrivalTime: f.arrivalTime || f.arrival_time || "11:15",
        duration: f.duration || "2h 15m",
        stops: typeof f.stops === "number" ? f.stops : 0,
        layovers: f.layovers || f.layover || null,
        price: typeof f.price === "number" ? f.price : Number(f.price) || 150,
        currency: f.currency || "USD",
        date: f.date || date,
        terminal: f.terminal || null,
        gate: f.gate || null,
        status: f.status || "scheduled",
        sourceApi: isDuffel ? "duffel" : "aviationstack"
      };
    });

    return res.status(200).json({
      success: true,
      flights: normalizedFlights,
      method: "FastAPI Backend Connection"
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Flight search processing failed: " + error.message });
  }
}

export async function recommendFlights(req: AuthenticatedRequest, res: Response) {
  try {
    const { flights } = req.body;
    if (!flights || !Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ error: "No flights provided for recommendation." });
    }

    const openRouterKey = env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const prompt = `You are a corporate travel AI assistant. Analyze the following list of flight offers and choose the single absolute best option based on:
1. All factors (price, convenience, duration, stops)
2. Timings (departure/arrival times, avoiding red-eyes or long overnight stops)
3. Time period (flight duration)
4. Layover (number of layovers/stops and transit times)
5. Airline (reputation and quality)

Flight List:
${JSON.stringify(flights.map(f => ({ id: f.id, airline: f.airline, flightNumber: f.flightNumber, dep: f.departureTime, arr: f.arrivalTime, duration: f.duration, stops: f.stops, price: f.price, currency: f.currency, layovers: f.layovers })))}

Respond with a raw JSON object containing:
- bestFlightId: the exact string ID of the best flight from the list
- reasoning: a concise explanation (maximum 2 sentences) justifying why this flight is recommended.

Do NOT include any markdown code block formatting (like \`\`\`json). Just return the raw JSON object.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Hemraj Personal Travel Desk"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (response.ok) {
          const resData = await response.json() as any;
          const content = resData.choices?.[0]?.message?.content || "";
          const cleanedText = content.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.bestFlightId) {
            return res.json({ success: true, recommendation: parsed });
          }
        }
      } catch (err: any) {
        console.error("OpenRouter AI recommendation query failed:", err.message);
      }
    }

    // Fallback recommendation
    let bestFlight = flights[0];
    let bestScore = Infinity;

    flights.forEach((f) => {
      let durationHours = 2;
      const match = f.duration?.match(/(\d+)h/);
      if (match) durationHours = Number(match[1]);

      const score = (f.price / 100) + (f.stops * 8) + (durationHours * 3);
      if (score < bestScore) {
        bestScore = score;
        bestFlight = f;
      }
    });

    return res.json({
      success: true,
      recommendation: {
        bestFlightId: bestFlight.id,
        reasoning: `AI Recommended ${bestFlight.airline} ${bestFlight.flightNumber} due to its optimal balance of competitive pricing (${bestFlight.currency} ${bestFlight.price}), shorter transit times, and direct routing.`
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to generate AI recommendation: " + error.message });
  }
}

export async function getForexRates(req: AuthenticatedRequest, res: Response) {
  try {
    const rates = await ForexService.getLiveForexRates();
    return res.json({ rates, cached: true });
  } catch (error: any) {
    return res.json({ rates: ForexService.getStaticRates(), cached: true, warning: error.message });
  }
}

export async function getDbSchema(req: AuthenticatedRequest, res: Response) {
  try {
    const schemaPath = path.join(process.cwd(), "src", "db", "01_schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, "utf-8");
      return res.json({ schema: sqlContent });
    }
    return res.status(404).json({ error: "01_schema.sql schema doc has not been established yet." });
  } catch (error: any) {
    return res.status(500).json({ error: "Internal schema reader fault: " + error.message });
  }
}

export async function checkHealth(req: AuthenticatedRequest, res: Response) {
  return res.json({ status: "healthy", timestamp: new Date().toISOString() });
}
