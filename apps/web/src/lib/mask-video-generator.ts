import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { MaskShape } from "@/types/content-fill";

async function getNewFFmpegInstance(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd"
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
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

  const ffmpeg = await getNewFFmpegInstance();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    const uniqueId = `mask_gen_${Date.now()}`;
    const inputFilename = `${uniqueId}_mask.png`;
    const outputFilename = `${uniqueId}_mask_video.mp4`;

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Start with black background (areas to keep)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, videoWidth, videoHeight);
    
    console.log(`Drawing ${masks.length} masks in white on ${videoWidth}x${videoHeight} canvas`);
    
    // Draw masks in white (areas to inpaint)
    ctx.fillStyle = "white";
    masks.forEach((mask, index) => {
      console.log(`Drawing mask ${index + 1}/${masks.length}:`, mask.type, mask.points.length, 'points');
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        
        // Clamp coordinates to canvas bounds
        const clampedX = Math.max(0, Math.min(x, videoWidth));
        const clampedY = Math.max(0, Math.min(y, videoHeight));
        const clampedWidth = Math.min(width, videoWidth - clampedX);
        const clampedHeight = Math.min(height, videoHeight - clampedY);
        
        console.log(`Rectangle: original(${x},${y},${width},${height}) -> clamped(${clampedX},${clampedY},${clampedWidth},${clampedHeight})`);
        
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

    // Debug: Create a data URL to inspect the mask
    const maskDataUrl = canvas.toDataURL();
    console.log("Generated mask preview (copy to browser to inspect):", maskDataUrl.substring(0, 100) + "...");
    
    const maskImageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create mask image"));
      }, "image/png");
    });

    const maskImageData = new Uint8Array(await maskImageBlob.arrayBuffer());
    await ffmpeg.writeFile(inputFilename, maskImageData);

    const durationSeconds = frameCount / fps;

    const ffmpegArgs = [
      "-loop", "1",
      "-i", inputFilename,
      "-t", durationSeconds.toString(),
      "-r", fps.toString(),
      "-vf", `scale=${videoWidth}:${videoHeight}`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-y",
      outputFilename
    ];

    await ffmpeg.exec(ffmpegArgs);

    const maskVideoData = await ffmpeg.readFile(outputFilename);
    
    if (!maskVideoData || maskVideoData.byteLength === 0) {
      throw new Error("FFmpeg generated empty video data");
    }

    const maskVideoBlob = new Blob([maskVideoData], { type: "video/mp4" });
    return new File([maskVideoBlob], "mask_video.mp4", { type: "video/mp4" });

  } catch (error) {
    console.error("Failed to generate mask video:", error);
    throw new Error(`Mask video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    if (ffmpeg.loaded) {
      ffmpeg.terminate();
    }
  }
}
