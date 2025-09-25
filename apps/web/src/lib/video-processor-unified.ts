/**
 * Unified Video Processor - Handles trimming and mask overlay in ONE FFmpeg operation
 * This avoids race conditions by doing everything in a single FFmpeg instance
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { MaskShape } from "@/types/content-fill";

export async function processVideoForContentFill(
  sourceVideo: File,
  masks: MaskShape[],
  startTime: number,
  duration: number,
  videoWidth: number,
  videoHeight: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log("Processing video with unified FFmpeg operation...", {
    startTime,
    duration,
    videoWidth,
    videoHeight,
    masksCount: masks.length,
    sourceVideoSize: sourceVideo.size
  });

  // Create a fresh FFmpeg instance for this operation
  const ffmpeg = new FFmpeg();
  
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    const uniqueId = `unified_${Date.now()}`;
    const sourceFilename = `${uniqueId}_source.mp4`;
    const overlayFilename = `${uniqueId}_overlay.png`;
    const outputFilename = `${uniqueId}_processed.mp4`;

    // 1. Create the grey mask overlay image
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Start with transparent background
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw grey masks (areas to inpaint)
    ctx.fillStyle = "rgba(128, 128, 128, 1)"; // Solid grey
    masks.forEach((mask) => {
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        
        // Clamp to canvas bounds
        const clampedX = Math.max(0, Math.min(x, videoWidth));
        const clampedY = Math.max(0, Math.min(y, videoHeight));
        const clampedWidth = Math.min(width, videoWidth - clampedX);
        const clampedHeight = Math.min(height, videoHeight - clampedY);
        
        ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
      } else if (mask.type === "brush" && mask.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(
          Math.max(0, Math.min(mask.points[0].x, videoWidth)),
          Math.max(0, Math.min(mask.points[0].y, videoHeight))
        );
        for (let i = 1; i < mask.points.length; i++) {
          ctx.lineTo(
            Math.max(0, Math.min(mask.points[i].x, videoWidth)),
            Math.max(0, Math.min(mask.points[i].y, videoHeight))
          );
        }
        ctx.lineWidth = mask.strokeWidth || 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fill();
      }
    });

    // Convert overlay to PNG
    const overlayBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create overlay image"));
      }, "image/png");
    });

    // 2. Write files to FFmpeg
    const sourceVideoData = new Uint8Array(await sourceVideo.arrayBuffer());
    const overlayImageData = new Uint8Array(await overlayBlob.arrayBuffer());
    
    await ffmpeg.writeFile(sourceFilename, sourceVideoData);
    await ffmpeg.writeFile(overlayFilename, overlayImageData);

    // 3. Single FFmpeg command that does BOTH trim AND overlay in one operation
    const ffmpegArgs = [
      "-i", sourceFilename,                    // Input video
      "-i", overlayFilename,                   // Grey overlay
      "-ss", startTime.toString(),             // Start time (trim start)
      "-t", duration.toString(),               // Duration (trim duration)
      "-filter_complex", 
      "[0:v][1:v]overlay=0:0",                 // Apply grey overlay
      "-c:v", "libx264",                       // H.264 codec
      "-pix_fmt", "yuv420p",                   // Pixel format
      "-c:a", "copy",                          // Copy audio
      "-y",                                    // Overwrite output
      outputFilename                           // Output file
    ];

    console.log("Unified FFmpeg command:", ffmpegArgs.join(" "));

    await ffmpeg.exec(ffmpegArgs);

    // 4. Read the processed video
    const processedVideoData = await ffmpeg.readFile(outputFilename);
    
    if (!processedVideoData || processedVideoData.byteLength === 0) {
      throw new Error("FFmpeg generated empty video data");
    }

    // 5. Create and return the processed video file
    const processedVideoBlob = new Blob([processedVideoData], { type: "video/mp4" });
    const processedVideoFile = new File([processedVideoBlob], "processed_source.mp4", { 
      type: "video/mp4" 
    });

    console.log("Video processed successfully:", {
      size: processedVideoFile.size,
      type: processedVideoFile.type,
      name: processedVideoFile.name
    });

    return processedVideoFile;

  } catch (error) {
    console.error("Failed to process video:", error);
    throw new Error(`Video processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    // Terminate the FFmpeg instance completely
    if (ffmpeg.loaded) {
      ffmpeg.terminate();
    }
  }
}
