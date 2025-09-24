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

    // Ensure proper file extension and type for video files
    let uploadFile = file;
    if (file.type.startsWith('video/') || file.name.includes('video') || !file.type) {
      console.log("Processing video file for upload...");
      
      // Ensure proper MIME type
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        mimeType = 'video/mp4';
        console.log("Fixed MIME type to:", mimeType);
      }
      
      // Ensure proper extension
      let filename = file.name;
      if (!filename.match(/\.(mp4|mov|avi|webm)$/i)) {
        const extension = mimeType.includes('mp4') ? '.mp4' : '.mp4';
        filename = filename.replace(/\.[^.]*$/, '') + extension; // Replace existing extension
        if (!filename.includes('.')) {
          filename += extension; // Add extension if none exists
        }
        console.log("Fixed filename:", filename);
      }
      
      uploadFile = new File([file], filename, { type: mimeType });
      console.log("Final upload file:", {
        name: uploadFile.name,
        type: uploadFile.type,
        size: uploadFile.size
      });
    }

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
