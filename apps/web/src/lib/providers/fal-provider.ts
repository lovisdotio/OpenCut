import {
  ContentFillJob,
  ContentFillParameters,
  ContentFillProvider,
  MaskShape,
} from "@/types/content-fill";
import { FalClient } from "./fal-client";

interface FalApiResponse {
  video?: {
    url: string;
  };
  prompt?: string;
  seed?: number;
}

class FalProvider implements ContentFillProvider {
  name = "fal.ai WAN VACE 14B";
  id = "fal-wan-vace-14b";

  private client: FalClient;

  constructor(apiKey: string) {
    this.client = new FalClient(apiKey);
  }

  async processVideo(
    videoFile: File,
    maskFile: File,
    parameters: ContentFillParameters,
    onProgress?: (progress: number) => void,
    onLog?: (log: string) => void
  ): Promise<ContentFillJob> {
    const jobId = `fal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("Starting fal.ai processing...");
      
      if (onProgress) onProgress(10);

      // Upload video and mask files
      console.log("Uploading files...");
      const [videoUrl, maskUrl] = await Promise.all([
        this.client.uploadFile(videoFile),
        this.client.uploadFile(maskFile),
      ]);

      console.log("Files uploaded:", { videoUrl, maskUrl });
      if (onProgress) onProgress(30);

      // Prepare the request payload (matching your working example exactly)
      const payload = {
        prompt: parameters.prompt,
        negative_prompt: parameters.negativePrompt,
        match_input_num_frames: parameters.matchInputNumFrames,
        num_frames: parameters.numFrames,
        match_input_frames_per_second: parameters.matchInputFramesPerSecond,
        frames_per_second: parameters.framesPerSecond,
        resolution: parameters.resolution,
        aspect_ratio: parameters.aspectRatio,
        num_inference_steps: parameters.numInferenceSteps,
        guidance_scale: parameters.guidanceScale,
        video_url: videoUrl,
        mask_video_url: maskUrl,
        seed: parameters.seed,
        enable_safety_checker: parameters.enableSafetyChecker,
        enable_prompt_expansion: parameters.enablePromptExpansion,
        preprocess: parameters.preprocess,
        acceleration: parameters.acceleration,
      };

      // Submit job using the simplified API route (fal.ai client handles everything)
      console.log("Submitting job...");
      if (onProgress) onProgress(50);
      
      const result = await this.client.submitJob(payload);
      console.log("Job completed:", result);
      if (onProgress) onProgress(100);

      // Create successful job object
      const job: ContentFillJob = {
        id: jobId,
        elementId: "", // Will be set by the store
        trackId: "", // Will be set by the store
        status: "completed",
        progress: 100,
        createdAt: new Date(),
        completedAt: new Date(),
        parameters,
        masks: [], // Will be set by the store
        resultUrl: result.video?.url,
      };

      return job;
    } catch (error) {
      console.error("Fal.ai processing failed:", error);
      
      const job: ContentFillJob = {
        id: jobId,
        elementId: "",
        trackId: "",
        status: "failed",
        progress: 0,
        createdAt: new Date(),
        parameters,
        masks: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };

      return job;
    }
  }

  async getJobStatus(jobId: string): Promise<ContentFillJob> {
    // For now, fal.ai is synchronous, so we don't need to check status
    // In a real implementation, this would check the job status
    throw new Error("Job status checking not implemented for synchronous provider");
  }

  async cancelJob(jobId: string): Promise<void> {
    // For synchronous provider, cancellation is not applicable
    console.log(`Cannot cancel synchronous job: ${jobId}`);
  }


  // Helper method to generate mask video from drawn masks
  static async generateMaskVideo(
    masks: MaskShape[],
    videoWidth: number,
    videoHeight: number,
    frameCount: number,
    fps: number
  ): Promise<File> {
    // Create a canvas to draw masks
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }

    // Create a simple mask image for now (single frame)
    // Clear canvas to black (areas to keep)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, videoWidth, videoHeight);
    
    // Draw masks in white (areas to inpaint)
    ctx.fillStyle = "white";
    masks.forEach((mask) => {
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        ctx.fillRect(x, y, width, height);
      } else if (mask.type === "brush" && mask.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(mask.points[0].x, mask.points[0].y);
        for (let i = 1; i < mask.points.length; i++) {
          ctx.lineTo(mask.points[i].x, mask.points[i].y);
        }
        ctx.lineWidth = mask.strokeWidth || 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fill();
      }
    });

    // Convert canvas to PNG image (fal.ai accepts mask images for short videos)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "mask.png", { type: "image/png" });
          resolve(file);
        } else {
          throw new Error("Failed to create mask image");
        }
      }, "image/png");
    });
  }
}

// Export a factory function to create the provider
export const createFalProvider = (apiKey: string): ContentFillProvider => {
  return new FalProvider(apiKey);
};

// Export the class for static methods
export { FalProvider };
