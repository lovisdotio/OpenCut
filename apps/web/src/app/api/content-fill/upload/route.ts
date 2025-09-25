import { NextRequest, NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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

    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("Uploading file to fal.ai:", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Force proper video file format for all uploads
    let uploadFile = file;
    let filename = file.name;
    let mimeType = file.type;

    // Ensure .mp4 extension
    if (!filename.endsWith('.mp4')) {
      // Remove any existing extension and add .mp4
      filename = filename.replace(/\.[^.]*$/, '') + '.mp4';
      if (!filename.includes('.')) {
        filename += '.mp4';
      }
      console.log("Fixed filename to:", filename);
    }

    // Force video/mp4 MIME type
    if (!mimeType || !mimeType.startsWith('video/')) {
      mimeType = 'video/mp4';
      console.log("Fixed MIME type to:", mimeType);
    }

    // Create new file with corrected properties
    uploadFile = new File([file], filename, { type: mimeType });
    
    console.log("Final upload file:", {
      name: uploadFile.name,
      type: uploadFile.type,
      size: uploadFile.size
    });

    // Upload file using fal.ai client
    const fileUrl = await fal.storage.upload(uploadFile);
    
    console.log("Upload successful:", fileUrl);
    
    return NextResponse.json({ 
      file_url: fileUrl,
      url: fileUrl 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
