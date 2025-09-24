import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ContentFillJob,
  ContentFillParameters,
  MaskDrawingState,
  MaskShape,
} from "@/types/content-fill";

interface ContentFillStore {
  // Drawing state
  maskDrawing: MaskDrawingState;
  
  // AI Parameters
  parameters: ContentFillParameters;
  
  // Jobs
  jobs: ContentFillJob[];
  activeJobId: string | null;
  
  // Actions - Mask Drawing
  setDrawingTool: (tool: "rectangle" | "brush" | "eraser" | null) => void;
  toggleMaskVisibility: () => void;
  setStrokeWidth: (width: number) => void;
  addMask: (mask: MaskShape) => void;
  removeMask: (maskId: string) => void;
  clearMasks: () => void;
  updateMask: (maskId: string, updates: Partial<MaskShape>) => void;
  
  // Actions - Parameters
  updateParameters: (updates: Partial<ContentFillParameters>) => void;
  resetParameters: () => void;
  
  // Actions - Jobs
  createJob: (
    elementId: string,
    trackId: string,
    masks: MaskShape[]
  ) => Promise<string>;
  updateJob: (jobId: string, updates: Partial<ContentFillJob>) => void;
  addJobLog: (jobId: string, log: string) => void;
  removeJob: (jobId: string) => void;
  setActiveJob: (jobId: string | null) => void;
  getJobById: (jobId: string) => ContentFillJob | undefined;
  cleanupOldJobs: (elementId: string, trackId: string) => void;
}

const DEFAULT_PARAMETERS: ContentFillParameters = {
  prompt: "",
  negativePrompt: "letterboxing, borders, black bars, bright colors, overexposed, static, blurred details, subtitles, style, artwork, painting, picture, still, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, malformed limbs, fused fingers, still picture, cluttered background, three legs, many people in the background, walking backwards",
  strength: 0.8,
  numFrames: 81,
  framesPerSecond: 16,
  resolution: "720p",
  aspectRatio: "auto",
  numInferenceSteps: 30,
  guidanceScale: 5,
  enableSafetyChecker: true,
  enablePromptExpansion: false,
  preprocess: false,
  acceleration: "none",
  matchInputNumFrames: false,
  matchInputFramesPerSecond: false,
};

const DEFAULT_MASK_DRAWING: MaskDrawingState = {
  isDrawing: false,
  currentTool: null,
  currentMask: null,
  masks: [],
  strokeWidth: 20,
  isVisible: true,
};

export const useContentFillStore = create<ContentFillStore>()(
  persist(
    (set, get) => ({
      maskDrawing: DEFAULT_MASK_DRAWING,
      parameters: DEFAULT_PARAMETERS,
      jobs: [],
      activeJobId: null,

      // Mask Drawing Actions
      setDrawingTool: (tool) => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            currentTool: tool,
            isDrawing: false,
            currentMask: null,
          },
        }));
      },

      toggleMaskVisibility: () => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            isVisible: !state.maskDrawing.isVisible,
          },
        }));
      },

      setStrokeWidth: (width) => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            strokeWidth: width,
          },
        }));
      },

      addMask: (mask) => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            masks: [...state.maskDrawing.masks, mask],
          },
        }));
      },

      removeMask: (maskId) => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            masks: state.maskDrawing.masks.filter((m) => m.id !== maskId),
          },
        }));
      },

      clearMasks: () => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            masks: [],
            currentMask: null,
            isDrawing: false,
          },
        }));
      },

      updateMask: (maskId, updates) => {
        set((state) => ({
          maskDrawing: {
            ...state.maskDrawing,
            masks: state.maskDrawing.masks.map((mask) =>
              mask.id === maskId ? { ...mask, ...updates } : mask
            ),
          },
        }));
      },

      // Parameter Actions
      updateParameters: (updates) => {
        set((state) => ({
          parameters: { ...state.parameters, ...updates },
        }));
      },

      resetParameters: () => {
        set({ parameters: DEFAULT_PARAMETERS });
      },

      // Job Actions
      createJob: async (elementId, trackId, masks) => {
        // Check if there's already a processing job for this element
        const existingJob = get().jobs.find(
          job => job.elementId === elementId && 
                 job.trackId === trackId && 
                 job.status === "processing"
        );

        if (existingJob) {
          console.warn("Job already processing for this element:", existingJob.id);
          return existingJob.id;
        }

        const jobId = `job_${elementId}_${trackId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        console.log("Creating new unique job:", jobId);
        
        const job: ContentFillJob = {
          id: jobId,
          elementId,
          trackId,
          status: "pending",
          progress: 0,
          createdAt: new Date(),
          parameters: { ...get().parameters }, // Clone parameters
          masks: [...masks], // Clone masks
          logs: [],
        };

        set((state) => ({
          jobs: [...state.jobs, job],
          activeJobId: jobId,
        }));

        return jobId;
      },

      updateJob: (jobId, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId ? { ...job, ...updates } : job
          ),
        }));
      },

      addJobLog: (jobId, log) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId 
              ? { ...job, logs: [...job.logs, log] } 
              : job
          ),
        }));
      },

      removeJob: (jobId) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId),
          activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
        }));
      },

      setActiveJob: (jobId) => {
        set({ activeJobId: jobId });
      },

      getJobById: (jobId) => {
        return get().jobs.find((job) => job.id === jobId);
      },

      cleanupOldJobs: (elementId, trackId) => {
        console.log("Cleaning up old jobs for element:", elementId);
        set((state) => ({
          jobs: state.jobs.filter((job) => 
            !(job.elementId === elementId && 
              job.trackId === trackId && 
              (job.status === "completed" || job.status === "failed"))
          ),
        }));
      },
    }),
    {
      name: "content-fill-store",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure rehydrated parameters are merged with defaults to prevent missing keys
          state.parameters = { ...DEFAULT_PARAMETERS, ...state.parameters };
        }
      },
      partialize: (state) => ({
        parameters: state.parameters,
        jobs: state.jobs.filter((job) => job.status === "completed"), // Only persist completed jobs
      }),
    }
  )
);
