import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();
  
  // Load FFmpeg
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd"
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpegInstance;
}

export async function trimVideo(
  sourceVideo: File,
  startTime: number,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log("Trimming video with FFmpeg...", {
    startTime,
    duration,
    sourceVideoSize: sourceVideo.size
  });

  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    const sourceVideoData = new Uint8Array(await sourceVideo.arrayBuffer());
    await ffmpeg.writeFile("source.mp4", sourceVideoData);

    const ffmpegArgs = [
      "-i", "source.mp4",
      "-ss", startTime.toString(),
      "-t", duration.toString(),
      "-c", "copy",
      "trimmed.mp4"
    ];

    console.log("FFmpeg trim command:", ffmpegArgs.join(" "));

    await ffmpeg.exec(ffmpegArgs);

    const trimmedVideoData = await ffmpeg.readFile("trimmed.mp4");

    await ffmpeg.deleteFile("source.mp4");
    await ffmpeg.deleteFile("trimmed.mp4");

    const trimmedVideoBlob = new Blob([trimmedVideoData], { type: "video/mp4" });
    const trimmedVideoFile = new File([trimmedVideoBlob], "trimmed.mp4", {
      type: "video/mp4"
    });

    console.log("Video trimmed successfully:", {
      size: trimmedVideoFile.size,
    });

    return trimmedVideoFile;
  } catch (error) {
    console.error("Failed to trim video:", error);
    throw new Error(`Video trimming failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
