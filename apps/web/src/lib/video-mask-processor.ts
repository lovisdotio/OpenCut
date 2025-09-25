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

export async function generateMaskedSourceVideo(
  sourceVideo: File,
  masks: MaskShape[],
  videoWidth: number,
  videoHeight: number,
  onProgress?: (progress: number) => void
): Promise<File> {

  const ffmpeg = await getNewFFmpegInstance();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    const uniqueId = `mask_apply_${Date.now()}`;
    const sourceFilename = `${uniqueId}_source.mp4`;
    const overlayFilename = `${uniqueId}_overlay.png`;
    const outputFilename = `${uniqueId}_masked_source.mp4`;

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.fillStyle = "rgb(128, 128, 128)";
    masks.forEach((mask) => {
      // ... drawing logic ...
    });

    const overlayBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create overlay image"));
      }, "image/png");
    });
    
    const sourceVideoData = new Uint8Array(await sourceVideo.arrayBuffer());
    const overlayImageData = new Uint8Array(await overlayBlob.arrayBuffer());
    
    await ffmpeg.writeFile(sourceFilename, sourceVideoData);
    await ffmpeg.writeFile(overlayFilename, overlayImageData);

    const ffmpegArgs = [
      "-i", sourceFilename,
      "-i", overlayFilename,
      "-filter_complex", 
      "[0:v][1:v]overlay=0:0:enable='between(t,0,999)'",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      "-y",
      outputFilename
    ];

    await ffmpeg.exec(ffmpegArgs);

    const maskedVideoData = await ffmpeg.readFile(outputFilename);
    
    const maskedVideoBlob = new Blob([maskedVideoData], { type: "video/mp4" });
    return new File([maskedVideoBlob], "masked_source.mp4", { type: "video/mp4" });

  } catch (error) {
    console.error("Failed to generate masked source video:", error);
    throw new Error(`Masked source video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    if (ffmpeg.loaded) {
      ffmpeg.terminate();
    }
  }
}
