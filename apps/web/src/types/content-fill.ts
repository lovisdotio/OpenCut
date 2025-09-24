/**
 * Content Fill Types - Types for AI-powered content filling functionality
 */

export interface MaskShape {
  id: string;
  type: "rectangle" | "brush" | "eraser";
  points: Array<{ x: number; y: number }>;
  strokeWidth?: number;
  color?: string;
}

export interface MaskDrawingState {
  isDrawing: boolean;
  currentTool: "rectangle" | "brush" | "eraser" | null;
  currentMask: MaskShape | null;
  masks: MaskShape[];
  strokeWidth: number;
  isVisible: boolean;
}

export interface ContentFillParameters {
  prompt: string;
  negativePrompt: string;
  strength: number;
  numFrames: number;
  framesPerSecond: number;
  resolution: "480p" | "580p" | "720p" | "1080p" | "2k" | "4k";
  aspectRatio: "auto" | "16:9" | "9:16" | "4:3" | "1:1";
  numInferenceSteps: number;
  guidanceScale: number;
  enableSafetyChecker: boolean;
  enablePromptExpansion: boolean;
  preprocess: boolean;
  acceleration: "none" | "tensorrt" | "openvino";
  matchInputNumFrames: boolean;
  matchInputFramesPerSecond: boolean;
  seed?: number;
}

export interface ContentFillJob {
  id: string;
  elementId: string;
  trackId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  parameters: ContentFillParameters;
  masks: MaskShape[];
  logs: string[];
  resultUrl?: string;
  error?: string;
}

export interface ContentFillProvider {
  name: string;
  id: string;
  processVideo(
    videoFile: File,
    maskFile: File,
    parameters: ContentFillParameters,
    onProgress?: (progress: number) => void,
    onLog?: (log: string) => void
  ): Promise<ContentFillJob>;
  getJobStatus(jobId: string): Promise<ContentFillJob>;
  cancelJob(jobId: string): Promise<void>;
}