/**
 * Video Preloader - Intelligent video frame preloading system
 * 
 * This system preloads video frames around the current playback position
 * to reduce lag and improve playback smoothness.
 */

import { videoCache } from "./video-cache";
import { MediaFile } from "@/types/media";
import { TimelineTrack, MediaElement } from "@/types/timeline";

interface PreloadJob {
  mediaId: string;
  file: File;
  targetTime: number;
  priority: number; // Higher = more important
}

class VideoPreloader {
  private preloadQueue: PreloadJob[] = [];
  private isPreloading = false;
  private preloadRadius = 3; // Seconds to preload around current time
  private maxConcurrentPreloads = 2;
  private currentPreloads = 0;

  /**
   * Schedule preloading for videos around the current time
   */
  schedulePreload({
    currentTime,
    tracks,
    mediaFiles,
    playbackSpeed = 1,
  }: {
    currentTime: number;
    tracks: TimelineTrack[];
    mediaFiles: MediaFile[];
    playbackSpeed?: number;
  }): void {
    // Clear old jobs
    this.preloadQueue = [];

    // Adjust preload radius based on playback speed
    const adjustedRadius = this.preloadRadius / Math.max(0.5, playbackSpeed);

    // Find active and upcoming video elements
    const videoElements = this.findRelevantVideoElements({
      currentTime,
      tracks,
      mediaFiles,
      lookAheadTime: adjustedRadius,
    });

    // Create preload jobs
    for (const element of videoElements) {
      const mediaItem = mediaFiles.find((m) => m.id === element.mediaId);
      if (!mediaItem || mediaItem.type !== "video" || !mediaItem.file) continue;

      // Calculate times to preload within this element
      const elementStart = element.startTime;
      const elementEnd = element.startTime + element.duration - element.trimStart - element.trimEnd;
      
      const preloadStart = Math.max(
        elementStart,
        currentTime - adjustedRadius
      );
      const preloadEnd = Math.min(
        elementEnd,
        currentTime + adjustedRadius
      );

      // Create jobs for key frames within the range
      const frameInterval = 1 / 24; // 24fps sampling
      for (let time = preloadStart; time < preloadEnd; time += frameInterval) {
        const localTime = time - elementStart + element.trimStart;
        const distanceFromCurrent = Math.abs(time - currentTime);
        const priority = Math.max(0, 100 - distanceFromCurrent * 10);

        this.preloadQueue.push({
          mediaId: mediaItem.id,
          file: mediaItem.file,
          targetTime: localTime,
          priority,
        });
      }
    }

    // Sort by priority (higher first)
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    // Start preloading
    this.processPreloadQueue();
  }

  /**
   * Find video elements that are currently playing or will play soon
   */
  private findRelevantVideoElements({
    currentTime,
    tracks,
    mediaFiles,
    lookAheadTime,
  }: {
    currentTime: number;
    tracks: TimelineTrack[];
    mediaFiles: MediaFile[];
    lookAheadTime: number;
  }): MediaElement[] {
    const relevantElements: MediaElement[] = [];
    const searchStart = currentTime - 1; // 1 second behind
    const searchEnd = currentTime + lookAheadTime;

    for (const track of tracks) {
      if (track.muted || track.type !== "media") continue;

      for (const element of track.elements) {
        if (element.type !== "media" || element.hidden) continue;
        
        const mediaElement = element as MediaElement;
        const elementStart = element.startTime;
        const elementEnd = element.startTime + element.duration - element.trimStart - element.trimEnd;

        // Check if element overlaps with our search range
        if (elementStart < searchEnd && elementEnd > searchStart) {
          const mediaItem = mediaFiles.find((m) => m.id === mediaElement.mediaId);
          if (mediaItem?.type === "video") {
            relevantElements.push(mediaElement);
          }
        }
      }
    }

    return relevantElements;
  }

  /**
   * Process the preload queue with concurrency control
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;
    
    this.isPreloading = true;

    while (this.preloadQueue.length > 0 && this.currentPreloads < this.maxConcurrentPreloads) {
      const job = this.preloadQueue.shift();
      if (!job) break;

      this.currentPreloads++;
      
      // Use requestIdleCallback for non-blocking preloading
      requestIdleCallback(async () => {
        try {
          await videoCache.getFrameAt(job.mediaId, job.file, job.targetTime);
        } catch (error) {
          console.warn(`Preload failed for ${job.mediaId} at ${job.targetTime}:`, error);
        } finally {
          this.currentPreloads--;
          
          // Continue processing queue
          if (this.preloadQueue.length > 0) {
            this.processPreloadQueue();
          } else if (this.currentPreloads === 0) {
            this.isPreloading = false;
          }
        }
      });
    }

    if (this.currentPreloads === 0) {
      this.isPreloading = false;
    }
  }

  /**
   * Clear all pending preload jobs
   */
  clearQueue(): void {
    this.preloadQueue = [];
  }

  /**
   * Get current preloader stats
   */
  getStats() {
    return {
      queueLength: this.preloadQueue.length,
      activePreloads: this.currentPreloads,
      isPreloading: this.isPreloading,
    };
  }

  /**
   * Configure preloader settings
   */
  configure({
    preloadRadius,
    maxConcurrentPreloads,
  }: {
    preloadRadius?: number;
    maxConcurrentPreloads?: number;
  }): void {
    if (preloadRadius !== undefined) {
      this.preloadRadius = Math.max(1, Math.min(10, preloadRadius));
    }
    if (maxConcurrentPreloads !== undefined) {
      this.maxConcurrentPreloads = Math.max(1, Math.min(4, maxConcurrentPreloads));
    }
  }
}

export const videoPreloader = new VideoPreloader();
