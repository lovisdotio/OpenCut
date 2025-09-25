import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// This function creates a NEW, ISOLATED instance of FFmpeg every time it's called.
// This prevents any state pollution between different FFmpeg operations.
async function getNewFFmpegInstance(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd"
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
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

  const ffmpeg = await getNewFFmpegInstance();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  try {
    const uniqueId = `trim_${Date.now()}`;
    const sourceFilename = `${uniqueId}_source.mp4`;
    const outputFilename = `${uniqueId}_trimmed.mp4`;

    const sourceVideoData = new Uint8Array(await sourceVideo.arrayBuffer());
    await ffmpeg.writeFile(sourceFilename, sourceVideoData);

    const ffmpegArgs = [
      "-i", sourceFilename,
      "-ss", startTime.toString(),
      "-t", duration.toString(),
      "-c", "copy",
      outputFilename
    ];

    console.log("FFmpeg trim command:", ffmpegArgs.join(" "));

    await ffmpeg.exec(ffmpegArgs);

    const trimmedVideoData = await ffmpeg.readFile(outputFilename);

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
  } finally {
    // Terminate the FFmpeg instance to free up memory and ensure a clean state for the next operation.
    if (ffmpeg.loaded) {
      ffmpeg.terminate();
    }
  }
}
