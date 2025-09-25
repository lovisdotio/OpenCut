/**
 * Content Fill Service - Handles AI-powered content filling operations
 * 
 * This service provides functionality for processing video content with AI
 * using fal.ai WAN-VACE 14B model, managing API keys, and integrating 
 * results back into the timeline.
 */

import { useContentFillStore } from "@/stores/content-fill-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { ContentFillJob, MaskShape } from "@/types/content-fill";
import { createFalProvider, FalProvider } from "@/lib/providers/fal-provider";
import { MediaFile } from "@/types/media";

export function useContentFillService() {
  const contentFillStore = useContentFillStore();
  const timelineStore = useTimelineStore();
  const mediaStore = useMediaStore();

  /**
   * Set API key for the fal.ai service
   */
  const setApiKey = (apiKey: string) => {
    localStorage.setItem('fal-ai-api-key', apiKey);
    console.log('fal.ai API key set for content fill service');
  };

  /**
   * Get stored fal.ai API key
   */
  const getApiKey = (): string | null => {
    return localStorage.getItem('fal-ai-api-key');
  };

  /**
   * Process content fill for a video element using fal.ai WAN-VACE 14B
   */
  const processContentFill = async ({
    elementId,
    trackId,
    masks,
  }: {
    elementId: string;
    trackId: string;
    masks: MaskShape[];
  }): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    try {
      // Check if API key is available
      const apiKey = getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'fal.ai API key not set. Please configure your API key first.',
        };
      }

      // Get the media file for this element
      const tracks = timelineStore.tracks;
      const track = tracks.find(t => t.id === trackId);
      const element = track?.elements.find(e => e.id === elementId);
      
      if (!element || element.type !== 'media') {
        return {
          success: false,
          error: 'Element not found or is not a media element',
        };
      }

      const mediaFiles = mediaStore.mediaFiles;
      const mediaFile = mediaFiles.find(f => f.id === element.mediaId);
      
      if (!mediaFile || mediaFile.type !== 'video' || !mediaFile.file) {
        return {
          success: false,
          error: 'Video file not found or invalid',
        };
      }

      // Create a new job
      const jobId = await contentFillStore.createJob(elementId, trackId, masks);
      
      // Update job status to processing
      contentFillStore.updateJob(jobId, {
        status: 'processing',
        progress: 0,
      });

      contentFillStore.addJobLog(jobId, 'Starting fal.ai WAN-VACE 14B processing...');

      try {
        // Get current parameters from store
        const parameters = contentFillStore.parameters;
        
        // Debug: Log current parameters
        console.log('Content Fill Parameters:', {
          numFrames: parameters.numFrames,
          framesPerSecond: parameters.framesPerSecond,
          resolution: parameters.resolution,
          prompt: parameters.prompt?.slice(0, 50) + '...'
        });
        
        // Create fal.ai provider
        const provider = createFalProvider(apiKey);
        
        const { generateMaskVideo } = await import('@/lib/mask-video-generator');
        
        // Ensure parameters have valid values
        const safeNumFrames = parameters.numFrames || 81;
        const safeFramesPerSecond = parameters.framesPerSecond || 16;
        const safeResolution = parameters.resolution === "1080p" || parameters.resolution === "2k" || parameters.resolution === "4k" 
          ? "720p" 
          : (parameters.resolution as "480p" | "580p" | "720p") || "720p";

        // Calculate trimmed duration for the mask video
        const trimmedDuration = element.duration - element.trimStart - element.trimEnd;
        const trimmedFrameCount = Math.round(trimmedDuration * safeFramesPerSecond);
        
        // Generate mask video (black and white) with correct duration
        contentFillStore.addJobLog(jobId, 'Generating mask video...');
        const maskFile = await generateMaskVideo(
          masks,
          mediaFile.width || 1920,
          mediaFile.height || 1080,
          trimmedFrameCount, // Use trimmed frame count
          safeFramesPerSecond,
          safeResolution,
          (progress) => contentFillStore.updateJob(jobId, { progress: Math.round(10 + progress * 0.4) }) // 10-50%
        );
        contentFillStore.addJobLog(jobId, '✅ Mask video generated.');
        
        // Process source video (trim + apply grey mask in ONE operation)
        contentFillStore.addJobLog(jobId, 'Processing source video (trim + grey mask)...');
        const { processVideoForContentFill } = await import('@/lib/video-processor-unified');
        
        const processedSourceVideo = await processVideoForContentFill(
          mediaFile.file,
          masks,
          element.trimStart,
          trimmedDuration,
          mediaFile.width || 1920,
          mediaFile.height || 1080,
          (progress) => contentFillStore.updateJob(jobId, { progress: Math.round(50 + progress * 0.4) }) // 50-90%
        );
        contentFillStore.addJobLog(jobId, '✅ Source video processed (trimmed + grey mask applied).');
        
        // Debug: Log file information before upload
        contentFillStore.addJobLog(jobId, `Source video: ${processedSourceVideo.name} (${processedSourceVideo.type}, ${Math.round(processedSourceVideo.size / 1024)}KB)`);
        contentFillStore.addJobLog(jobId, `Mask video: ${maskFile.name} (${maskFile.type}, ${Math.round(maskFile.size / 1024)}KB)`);
        
        // Process with fal.ai
        contentFillStore.addJobLog(jobId, 'Submitting to fal.ai WAN-VACE 14B...');
        
        const result = await provider.processVideo(
          processedSourceVideo,
          maskFile,
          parameters,
          (progress) => {
            contentFillStore.updateJob(jobId, { progress: Math.round(90 + progress * 0.1) }); // 90-100%
          },
          (log) => {
            contentFillStore.addJobLog(jobId, log);
          }
        );

        // Update job with result
        contentFillStore.updateJob(jobId, {
          status: result.status,
          progress: 100,
          resultUrl: result.resultUrl,
          error: result.error,
          completedAt: new Date(),
        });

        if (result.status === 'completed') {
          contentFillStore.addJobLog(jobId, 'Content fill completed successfully!');
          
          // Automatically add result to project timeline
          try {
            contentFillStore.addJobLog(jobId, 'Auto-adding result to timeline...');
            const addedSuccessfully = await addResultToProject(result);
            
            if (addedSuccessfully) {
              contentFillStore.addJobLog(jobId, '✅ Result automatically added to timeline!');
              
              // Show success notification
              const { toast } = await import('sonner');
              toast.success('Content Fill completed! Result added to timeline above original.', {
                duration: 5000,
              });
            } else {
              contentFillStore.addJobLog(jobId, '⚠️ Could not auto-add to timeline - check Media panel');
              
              const { toast } = await import('sonner');
              toast.warning('Content Fill completed but could not auto-add to timeline. Check Media panel.');
            }
          } catch (autoAddError) {
            console.error('Auto-add to timeline failed:', autoAddError);
            contentFillStore.addJobLog(jobId, '⚠️ Auto-add failed - result available in Media panel');
            
            const { toast } = await import('sonner');
            toast.warning('Content Fill completed but auto-add failed. Result available in Media panel.');
          }
        } else {
          contentFillStore.addJobLog(jobId, `Processing failed: ${result.error}`);
          
          const { toast } = await import('sonner');
          toast.error(`Content Fill failed: ${result.error}`);
        }

        return {
          success: result.status === 'completed',
          jobId,
          error: result.error,
        };

      } catch (providerError) {
        console.error('fal.ai provider error:', providerError);
        
        const errorMessage = providerError instanceof Error ? providerError.message : 'Unknown provider error';
        
        contentFillStore.updateJob(jobId, {
          status: 'failed',
          error: errorMessage,
        });
        
        contentFillStore.addJobLog(jobId, `Error: ${errorMessage}`);

        return {
          success: false,
          jobId,
          error: errorMessage,
        };
      }

    } catch (error) {
      console.error('Content fill processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  /**
   * Add completed result to the project timeline
   */
  const addResultToProject = async (
    jobOrJobId: ContentFillJob | string, 
    projectId?: string
  ): Promise<boolean> => {
    // Handle both job object and job ID
    const job = typeof jobOrJobId === 'string' 
      ? contentFillStore.getJobById(jobOrJobId)
      : jobOrJobId;

    if (!job) {
      console.error('Job not found');
      return false;
    }
    
    try {
      if (job.status !== 'completed' || !job.resultUrl) {
        console.error('Job is not completed or has no result URL');
        return false;
      }

      const activeProject = useProjectStore.getState().activeProject;
      if (!activeProject) {
        console.error('No active project found');
        return false;
      }

      contentFillStore.addJobLog(job.id, 'Downloading result video...');
      const response = await fetch(job.resultUrl);
      if (!response.ok) throw new Error(`Failed to download result: ${response.statusText}`);

      const videoBlob = await response.blob();
      const resultFile = new File([videoBlob], `content_fill_result_${Date.now()}.mp4`, { type: 'video/mp4' });

      if (resultFile.size === 0) throw new Error('Downloaded video file is empty');

      let videoMetadata: {
        duration: number;
        width: number;
        height: number;
        fps: number;
      } = { duration: 0, width: 0, height: 0, fps: 0 };

      try {
        videoMetadata = await getVideoMetadata(resultFile);
        contentFillStore.addJobLog(job.id, `Video metadata loaded: ${videoMetadata.width}x${videoMetadata.height}, ${videoMetadata.duration.toFixed(2)}s`);
      } catch (metadataError) {
        console.error('Failed to load video metadata:', metadataError);
        contentFillStore.addJobLog(job.id, `Failed to load video metadata: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
        videoMetadata = {
          duration: 0,
          width: 0,
          height: 0,
          fps: 0,
        };
        contentFillStore.addJobLog(job.id, `Using fallback metadata: ${videoMetadata.width}x${videoMetadata.height}, ${videoMetadata.duration.toFixed(2)}s`);
      }
      
      // Generate thumbnail for the result video
      contentFillStore.addJobLog(job.id, 'Generating video thumbnail...');
      
      let thumbnailUrl: string | undefined;
      try {
        const { generateVideoThumbnail } = await import('@/stores/media-store');
        const thumbnailData = await generateVideoThumbnail(resultFile);
        thumbnailUrl = thumbnailData.thumbnailUrl;
        contentFillStore.addJobLog(job.id, 'Thumbnail generated');
      } catch (thumbnailError) {
        console.error('Failed to generate thumbnail:', thumbnailError);
        contentFillStore.addJobLog(job.id, '⚠️ Could not generate thumbnail');
      }

      // Add the result as a new media file
      const resultUrl = URL.createObjectURL(resultFile);
      const mediaData: Omit<MediaFile, "id"> = {
        name: `Content Fill Result - ${job.parameters.prompt.slice(0, 30)}...`,
        type: 'video' as const,
        file: resultFile,
        url: resultUrl,
        duration: videoMetadata.duration,
        width: videoMetadata.width,
        height: videoMetadata.height,
        fps: videoMetadata.fps,
        thumbnailUrl, // Add thumbnail for proper display
      };

      console.log('Media data prepared:', mediaData);

      // Add to media store and get the new ID
      const newMediaId = await mediaStore.addMediaFile(activeProject.id, mediaData);
      contentFillStore.addJobLog(job.id, 'Added to Media panel');

      // Force refresh of media store to ensure proper import
      await mediaStore.loadProjectMedia(activeProject.id);
      contentFillStore.addJobLog(job.id, 'Media panel refreshed');

      const newMediaItem = useMediaStore.getState().mediaFiles.find(item => item.id === newMediaId);

      if (newMediaItem) {
        timelineStore.addContentFillResult(job.trackId, job.elementId, newMediaItem);
        return true;
      }

      return false;
      
    } catch (error) {
      console.error('Failed to add result to project:', error);
      contentFillStore.addJobLog(job.id, `Error adding to project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  /**
   * Get video metadata from file with robust error handling
   */
  const getVideoMetadata = (file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
  }> => {
    return new Promise((resolve, reject) => {
      console.log('Getting video metadata for:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true; // Avoid audio issues
      
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Video metadata loading timed out (10s)'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        if (video.src) {
          URL.revokeObjectURL(video.src);
        }
        video.remove();
      };
      
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });

        // Validate metadata
        if (!video.duration || video.duration === 0) {
          cleanup();
          reject(new Error('Video has no duration or invalid duration'));
          return;
        }

        if (!video.videoWidth || !video.videoHeight) {
          cleanup();
          reject(new Error('Video has no dimensions'));
          return;
        }

        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30, // Default FPS, could be improved with more detection
        });
        cleanup();
      };
      
      video.onerror = (error) => {
        console.error('Video metadata loading error:', error);
        cleanup();
        reject(new Error(`Failed to load video metadata: ${video.error?.message || 'Unknown error'}`));
      };

      video.onabort = () => {
        console.error('Video metadata loading aborted');
        cleanup();
        reject(new Error('Video metadata loading was aborted'));
      };
      
      try {
        video.src = URL.createObjectURL(file);
        video.load();
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to create video URL: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  };

  /**
   * Cancel a processing job
   */
  const cancelJob = (jobId: string) => {
    const job = contentFillStore.getJobById(jobId);
    if (job && job.status === 'processing') {
      contentFillStore.updateJob(jobId, {
        status: 'failed',
        error: 'Job cancelled by user',
      });
      contentFillStore.addJobLog(jobId, 'Job cancelled by user');
    }
  };

  /**
   * Retry a failed job
   */
  const retryJob = async (jobId: string) => {
    const job = contentFillStore.getJobById(jobId);
    if (!job) return;

    return await processContentFill({
      elementId: job.elementId,
      trackId: job.trackId,
      masks: job.masks,
    });
  };

  /**
   * Get service status and statistics
   */
  const getServiceStatus = () => {
    const jobs = contentFillStore.jobs;
    return {
      hasApiKey: !!getApiKey(),
      totalJobs: jobs.length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
    };
  };

  return {
    setApiKey,
    getApiKey,
    processContentFill,
    addResultToProject,
    cancelJob,
    retryJob,
    getServiceStatus,
  };
}
