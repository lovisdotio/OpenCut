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

    // Get job status from fal.ai
    const response = await fetch(
      `https://queue.fal.run/fal-ai/wan-vace-14b/inpainting/requests/${requestId}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Key ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Status check failed:", errorText);
      return NextResponse.json(
        { error: `Status check failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
