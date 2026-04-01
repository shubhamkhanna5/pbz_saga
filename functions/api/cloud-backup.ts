
export async function onRequest(context: any) {
  // Updated to match the locked URL from utils/cloudSync.ts
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzu0_TePEgb6snqPoIfTN60oqB3sbDNW24oQXxcX7W87LzplNpI0W7z853qBBsFXbmJ/exec";
  
  const request = context.request;
  const url = new URL(request.url);

  // Handle GET (Load/Restore) - Forward query params
  if (request.method === "GET") {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL + url.search, {
          method: "GET",
          headers: {
              'Cache-Control': 'no-cache'
          }
      });
      const text = await response.text();
      return new Response(text, {
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow CORS
            "Cache-Control": "no-store",
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ status: "ERROR", message: "Proxy Load Failed" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }

  // Handle OPTIONS (CORS Preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Handle POST (Backup)
  try {
    const body = await request.text();
    
    // Forward to Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });

    const text = await response.text();

    return new Response(text, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ status: "ERROR", message: "Proxy Backup Failed" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}
