import { NextRequest, NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const apiKey = request.headers.get("x-fal-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 }
      );
    }

    // Configure fal.ai client
    fal.config({
      credentials: apiKey,
    });

    console.log("Submitting job to fal.ai:", payload);

    // Submit job using fal.ai client with log capture
    const logs: string[] = [];
    
    const result = await fal.subscribe("fal-ai/wan-vace-14b/inpainting", {
      input: payload,
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Queue update:", update);
        
        // Capture logs for animation (with proper type checking)
        if ('logs' in update && update.logs && Array.isArray(update.logs)) {
          update.logs.forEach((log: any) => {
            if (log.message && typeof log.message === 'string') {
              logs.push(log.message);
            }
          });
        }
      },
    });

    console.log("Job completed successfully:", result);
    
    // Type the result properly
    const typedResult = result as {
      video?: { url: string; content_type?: string; file_name?: string; file_size?: number };
      prompt?: string;
      seed?: number;
    };
    
    // Return result with logs added
    return NextResponse.json({
      video: typedResult.video,
      prompt: typedResult.prompt,
      seed: typedResult.seed,
      logs: logs,
    });
  } catch (error) {
    console.error("Job submission error:", error);
    
    // Extract more detailed error information
    let errorMessage = "Job submission failed";
    let statusCode = 500;
    
    if (error && typeof error === 'object') {
      const err = error as any;
      if (err.status) statusCode = err.status;
      if (err.body) {
        console.error("Error body:", err.body);
        errorMessage = `Validation error: ${JSON.stringify(err.body)}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
