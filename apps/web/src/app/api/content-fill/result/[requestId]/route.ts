import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const apiKey = request.headers.get("x-fal-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 }
      );
    }

    const { requestId } = await params;

    // Get job result from fal.ai
    const response = await fetch(
      `https://queue.fal.run/fal-ai/wan-vace-14b/inpainting/requests/${requestId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Key ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Result fetch failed:", errorText);
      return NextResponse.json(
        { error: `Result fetch failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Result fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Result fetch failed" },
      { status: 500 }
    );
  }
}
