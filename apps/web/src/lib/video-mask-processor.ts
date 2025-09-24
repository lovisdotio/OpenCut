import { FFmpeg } from "@ffmpeg/ffmpeg";
import { MaskShape } from "@/types/content-fill";

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  
  ffmpegInstance = new FFmpeg();
  await ffmpegInstance.load();
  return ffmpegInstance;
}

export async function generateMaskedSourceVideo(
  sourceVideo: File,
  masks: MaskShape[],
  videoWidth: number,
  videoHeight: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log("Generating masked source video with FFmpeg...", {
    videoWidth,
    videoHeight,
    masksCount: masks.length,
    sourceVideoSize: sourceVideo.size
  });

  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    // Create a canvas to draw the mask overlay (grey squares)
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Create transparent overlay with grey masks
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw masks in grey (completely opaque)
    ctx.fillStyle = "rgb(128, 128, 128)"; // Solid grey overlay
    masks.forEach((mask, index) => {
      console.log(`Drawing grey overlay for mask ${index}:`, mask);
      
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        
        console.log(`Grey rectangle: x=${x}, y=${y}, width=${width}, height=${height}`);
        
        // Clamp coordinates to canvas bounds
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

    // Write files to FFmpeg
    const sourceVideoData = new Uint8Array(await sourceVideo.arrayBuffer());
    const overlayImageData = new Uint8Array(await overlayBlob.arrayBuffer());
    
    await ffmpeg.writeFile("source.mp4", sourceVideoData);
    await ffmpeg.writeFile("overlay.png", overlayImageData);

    // Create FFmpeg command to overlay the grey masks on the video
    const ffmpegArgs = [
      "-i", "source.mp4",              // Source video
      "-i", "overlay.png",             // Grey overlay
      "-filter_complex", 
      "[0:v][1:v]overlay=0:0:enable='between(t,0,999)'", // Overlay for entire duration
      "-c:v", "libx264",               // H.264 codec
      "-pix_fmt", "yuv420p",           // Pixel format
      "-c:a", "copy",                  // Copy audio as-is
      "-y",                            // Overwrite output
      "masked_source.mp4"              // Output filename
    ];

    console.log("FFmpeg overlay command:", ffmpegArgs.join(" "));

    await ffmpeg.exec(ffmpegArgs);

    // Read the generated masked video
    const maskedVideoData = await ffmpeg.readFile("masked_source.mp4");
    
    // Clean up temporary files
    try {
      await ffmpeg.deleteFile("source.mp4");
      await ffmpeg.deleteFile("overlay.png");
      await ffmpeg.deleteFile("masked_source.mp4");
    } catch (cleanupError) {
      console.warn("Failed to cleanup FFmpeg files:", cleanupError);
    }

    // Create and return the masked source video file
    const maskedVideoBlob = new Blob([maskedVideoData], { type: "video/mp4" });
    const maskedVideoFile = new File([maskedVideoBlob], "masked_source.mp4", { 
      type: "video/mp4" 
    });

    console.log("Masked source video generated successfully:", {
      size: maskedVideoFile.size,
      type: maskedVideoFile.type,
      name: maskedVideoFile.name
    });

    return maskedVideoFile;
  } catch (error) {
    console.error("Failed to generate masked source video:", error);
    throw new Error(`Masked source video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
