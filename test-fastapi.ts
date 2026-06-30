import dotenv from "dotenv";
dotenv.config();

async function testFastApi() {
  const fastApiUrl = (process.env.FASTAPI_URL || "http://localhost:8000").trim();
  console.log("FastAPI backend URL configured:", fastApiUrl);
  
  console.log("Testing POST query to FastAPI flight search endpoint...");
  try {
    const response = await fetch(`${fastApiUrl}/api/flights/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "DEL",
        destination: "BOM",
        date: "2026-07-10",
        flexibleDays: 5
      })
    });
    
    console.log("POST Response Status:", response.status, response.statusText);
    const json = await response.json() as any;
    console.log("POST Response Payload:", json);
  } catch (err: any) {
    console.error("POST Request failed:", err.message);
    
    // Fallback: test GET request
    console.log("Testing GET query to FastAPI flight search endpoint...");
    try {
      const getUrl = `${fastApiUrl}/flights?source=DEL&destination=BOM&date=2026-07-10&flexible_days=5`;
      console.log("GET Request URL:", getUrl);
      const getResponse = await fetch(getUrl);
      console.log("GET Response Status:", getResponse.status, getResponse.statusText);
      const getJson = await getResponse.json();
      console.log("GET Response Payload:", getJson);
    } catch (getErr: any) {
      console.error("GET Request failed:", getErr.message);
      console.log("Please verify that your FastAPI server is running on the configured port.");
    }
  }
}

testFastApi();
