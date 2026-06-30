async function testDuffel() {
  const token = "duffel_test_piRwQAAO6LvuIicEXDJbpV1JXrsx9QV5qhpSrSuFL0t";
  const url = "https://api.duffel.com/air/offer_requests";
  
  console.log("Sending POST offer request to Duffel...");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin: "DEL",
              destination: "BOM",
              departure_date: "2026-07-10"
            }
          ],
          passengers: [
            { type: "adult" }
          ],
          cabin_class: "economy"
        }
      })
    });
    
    console.log("HTTP Response Status:", response.status, response.statusText);
    const json = await response.json() as any;
    
    if (json.errors) {
      console.error("Duffel API Errors:", json.errors);
    } else if (json.data) {
      console.log("SUCCESS! Created Offer Request:", json.data.id);
      const offers = json.data.offers || [];
      console.log(`Retrieved ${offers.length} priced offers.`);
      if (offers.length > 0) {
        const firstOffer = offers[0];
        console.log("Sample Offer details:");
        console.log("- Offer ID:", firstOffer.id);
        console.log("- Total Amount:", firstOffer.total_amount, firstOffer.total_currency);
        console.log("- Owner Airline:", firstOffer.owner?.name, `(${firstOffer.owner?.iata_code})`);
        
        if (firstOffer.slices && firstOffer.slices[0]) {
          const slice = firstOffer.slices[0];
          console.log("- Slice Duration:", slice.duration);
          if (slice.segments && slice.segments[0]) {
            const segment = slice.segments[0];
            console.log("  - Segment Flight:", segment.marketing_carrier?.name, segment.marketing_carrier_flight_number);
            console.log("  - Route:", segment.origin?.iata_code, "->", segment.destination?.iata_code);
            console.log("  - Scheduled:", segment.departing_at, "to", segment.arriving_at);
          }
        }
      }
    } else {
      console.log("Raw Response:", json);
    }
  } catch (err: any) {
    console.error("Connection Failed:", err.message);
  }
}

testDuffel();
