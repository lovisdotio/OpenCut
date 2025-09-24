import { FFmpeg } from "@ffmpeg/ffmpeg";
import { MaskShape } from "@/types/content-fill";

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  
  ffmpegInstance = new FFmpeg();
  await ffmpegInstance.load();
  return ffmpegInstance;
}

export async function generateMaskVideo(
  masks: MaskShape[],
  videoWidth: number,
  videoHeight: number,
  frameCount: number,
  fps: number,
  targetResolution: "480p" | "580p" | "720p" = "720p",
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log("Generating mask video with FFmpeg...", {
    videoWidth,
    videoHeight,
    frameCount,
    fps,
    targetResolution,
    masksCount: masks.length
  });

  // Use original video dimensions - fal.ai will handle resolution scaling
  const targetDimensions = { width: videoWidth, height: videoHeight };
  
  console.log("Using original video dimensions for mask:", targetDimensions);

  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    // Create a canvas to draw the mask frame with target dimensions
    const canvas = document.createElement("canvas");
    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Create mask frame
    // Fill with black (areas to keep)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, targetDimensions.width, targetDimensions.height);
    
    // Draw masks in white (areas to inpaint) using direct video coordinates
    ctx.fillStyle = "white";
    masks.forEach((mask, index) => {
      console.log(`Drawing mask ${index}:`, mask);
      
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        
        console.log(`Rectangle mask: x=${x}, y=${y}, width=${width}, height=${height}`);
        console.log(`Canvas dimensions: ${targetDimensions.width}x${targetDimensions.height}`);
        
        // Clamp coordinates to canvas bounds
        const clampedX = Math.max(0, Math.min(x, targetDimensions.width));
        const clampedY = Math.max(0, Math.min(y, targetDimensions.height));
        const clampedWidth = Math.min(width, targetDimensions.width - clampedX);
        const clampedHeight = Math.min(height, targetDimensions.height - clampedY);
        
        console.log(`Clamped rectangle: x=${clampedX}, y=${clampedY}, width=${clampedWidth}, height=${clampedHeight}`);
        
        ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
      } else if (mask.type === "brush" && mask.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(
          Math.max(0, Math.min(mask.points[0].x, targetDimensions.width)),
          Math.max(0, Math.min(mask.points[0].y, targetDimensions.height))
        );
        for (let i = 1; i < mask.points.length; i++) {
          ctx.lineTo(
            Math.max(0, Math.min(mask.points[i].x, targetDimensions.width)),
            Math.max(0, Math.min(mask.points[i].y, targetDimensions.height))
          );
        }
        ctx.lineWidth = mask.strokeWidth || 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fill();
      }
    });

    // Convert canvas to PNG blob
    const maskImageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create mask image"));
      }, "image/png");
    });

    // Debug: Create a data URL to inspect the mask
    const maskDataUrl = canvas.toDataURL();
    console.log("Generated mask preview (copy this to browser to inspect):", maskDataUrl.substring(0, 100) + "...");
    
    // Optionally download the mask for inspection (uncomment for debugging)
    // const debugLink = document.createElement('a');
    // debugLink.href = maskDataUrl;
    // debugLink.download = 'debug_mask.png';
    // debugLink.click();

    // Write mask image to FFmpeg
    const maskImageData = new Uint8Array(await maskImageBlob.arrayBuffer());
    await ffmpeg.writeFile("mask.png", maskImageData);

    // Validate parameters
    if (!frameCount || frameCount <= 0) {
      throw new Error(`Invalid frameCount: ${frameCount}`);
    }
    if (!fps || fps <= 0) {
      throw new Error(`Invalid fps: ${fps}`);
    }

    // Calculate video duration
    const durationSeconds = frameCount / fps;
    console.log(`Calculating duration: ${frameCount} frames / ${fps} fps = ${durationSeconds} seconds`);

    // Validate duration
    if (!durationSeconds || durationSeconds <= 0) {
      throw new Error(`Invalid duration calculated: ${durationSeconds} seconds`);
    }

    // Generate mask video using FFmpeg
    // Create a video from the single mask image, repeated for the duration
    const ffmpegArgs = [
      "-loop", "1",                    // Loop the input image
      "-i", "mask.png",               // Input mask image
      "-t", durationSeconds.toString(), // Duration in seconds
      "-r", fps.toString(),           // Frame rate
      "-vf", `scale=${targetDimensions.width}:${targetDimensions.height}`, // Use original dimensions
      "-c:v", "libx264",              // H.264 codec
      "-pix_fmt", "yuv420p",          // Pixel format
      "-y",                           // Overwrite output
      "mask_video.mp4"                // Output filename
    ];

    console.log("FFmpeg command:", ffmpegArgs.join(" "));

    await ffmpeg.exec(ffmpegArgs);

    // Read the generated mask video
    const maskVideoData = await ffmpeg.readFile("mask_video.mp4");
    
    // Clean up temporary files
    try {
      await ffmpeg.deleteFile("mask.png");
      await ffmpeg.deleteFile("mask_video.mp4");
    } catch (cleanupError) {
      console.warn("Failed to cleanup FFmpeg files:", cleanupError);
    }

    // Verify the generated video data
    if (!maskVideoData || maskVideoData.byteLength === 0) {
      throw new Error("FFmpeg generated empty video data");
    }

    console.log("FFmpeg output size:", maskVideoData.byteLength, "bytes");

    // Create and return the mask video file
    const maskVideoBlob = new Blob([maskVideoData], { type: "video/mp4" });
    const maskVideoFile = new File([maskVideoBlob], "mask_video.mp4", { 
      type: "video/mp4" 
    });

    console.log("Mask video generated successfully:", {
      size: maskVideoFile.size,
      type: maskVideoFile.type,
      name: maskVideoFile.name,
      dataSize: maskVideoData.byteLength
    });

    // Verify the file is valid
    if (maskVideoFile.size === 0) {
      throw new Error("Generated mask video file is empty");
    }

    return maskVideoFile;
  } catch (error) {
    console.error("Failed to generate mask video:", error);
    throw new Error(`Mask video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
