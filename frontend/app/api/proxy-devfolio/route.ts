import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = "https://api.devfolio.co/api/hackathons?filter=application_open&page=1";
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Devfolio API responded with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Devfolio Proxy] Error fetching from Devfolio:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch from Devfolio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
