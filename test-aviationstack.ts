import dotenv from "dotenv";
dotenv.config();

async function test() {
  const apiKey = (process.env.AVIATIONSTACK_API_KEY || "").trim();
  console.log("Aviationstack API Key:", apiKey ? `***${apiKey.substring(Math.max(0, apiKey.length - 4))} (length: ${apiKey.length})` : "NOT CONFIGURED");
  
  if (!apiKey) {
    console.error("ERROR: AVIATIONSTACK_API_KEY is empty in .env");
    return;
  }

  const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&dep_iata=DEL&arr_iata=BOM&limit=3`;
  console.log("Request URL:", url);
  
  try {
    const res = await fetch(url);
    console.log("HTTP Response Status:", res.status, res.statusText);
    const json = await res.json() as any;
    console.log("Response Keys:", Object.keys(json));
    
    if (json.error) {
      console.error("API returned error code:", json.error.code, "-", json.error.message);
    } else if (json.data) {
      console.log(`SUCCESS! Retrieved ${json.data.length} flights.`);
      if (json.data.length > 0) {
        console.log("Sample Flight Details:");
        console.log("- Date:", json.data[0].flight_date);
        console.log("- Airline:", json.data[0].airline?.name);
        console.log("- Flight #:", json.data[0].flight?.iata || json.data[0].flight?.number);
        console.log("- Departure:", json.data[0].departure?.iata, "-", json.data[0].departure?.airport);
        console.log("- Arrival:", json.data[0].arrival?.iata, "-", json.data[0].arrival?.airport);
      }
    } else {
      console.log("Raw Response:", json);
    }
  } catch (err: any) {
    console.error("Connection Failed:", err.message);
  }
}

test();
