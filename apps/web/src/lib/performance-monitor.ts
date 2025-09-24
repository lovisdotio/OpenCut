/**
 * Performance Monitor - System performance tracking and optimization
 * 
 * This module provides real-time performance monitoring and automatic
 * optimization suggestions for the video editor.
 */

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  cacheHitRate: number;
  videoDecodingTime: number;
  renderTime: number;
  lastUpdate: number;
}

interface PerformanceThresholds {
  minFrameRate: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
  maxVideoDecodingTime: number;
  maxRenderTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    frameRate: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    videoDecodingTime: 0,
    renderTime: 0,
    lastUpdate: 0,
  };

  private thresholds: PerformanceThresholds = {
    minFrameRate: 24,
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    minCacheHitRate: 0.8, // 80%
    maxVideoDecodingTime: 50, // 50ms
    maxRenderTime: 16, // 16ms (60fps)
  };

  private frameRateHistory: number[] = [];
  private performanceObserver?: PerformanceObserver;
  private memoryCheckInterval?: number;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    // Frame rate monitoring
    this.startFrameRateMonitoring();
    
    // Memory monitoring
    this.startMemoryMonitoring();
    
    // Performance entries monitoring
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.handlePerformanceMeasure(entry);
          }
        }
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'] 
      });
    }
  }

  /**
   * Start frame rate monitoring using requestAnimationFrame
   */
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrameRate = () => {
      const currentTime = performance.now();
      frameCount++;

      // Calculate FPS every second
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.updateFrameRate(fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if ('memory' in performance) {
        // @ts-ignore - Chrome-specific API
        const memInfo = performance.memory;
        this.metrics.memoryUsage = memInfo.usedJSHeapSize;
      }
    };

    checkMemory();
    this.memoryCheckInterval = window.setInterval(checkMemory, 2000);
  }

  /**
   * Handle performance measure entries
   */
  private handlePerformanceMeasure(entry: PerformanceEntry): void {
    switch (entry.name) {
      case 'video-decode':
        this.metrics.videoDecodingTime = entry.duration;
        break;
      case 'frame-render':
        this.metrics.renderTime = entry.duration;
        break;
    }
  }

  /**
   * Update frame rate with smoothing
   */
  private updateFrameRate(fps: number): void {
    this.frameRateHistory.push(fps);
    
    // Keep only last 10 measurements
    if (this.frameRateHistory.length > 10) {
      this.frameRateHistory.shift();
    }

    // Calculate smoothed frame rate
    const avgFps = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
    this.metrics.frameRate = Math.round(avgFps);
    this.metrics.lastUpdate = Date.now();
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate(hitRate: number): void {
    this.metrics.cacheHitRate = hitRate;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  getPerformanceStatus(): {
    isGood: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Frame rate check
    if (this.metrics.frameRate < this.thresholds.minFrameRate) {
      issues.push(`Low frame rate: ${this.metrics.frameRate}fps (target: ${this.thresholds.minFrameRate}fps)`);
      suggestions.push('Consider reducing video quality or closing other browser tabs');
    }

    // Memory usage check
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      const memoryMB = Math.round(this.metrics.memoryUsage / (1024 * 1024));
      issues.push(`High memory usage: ${memoryMB}MB`);
      suggestions.push('Try clearing video cache or reducing timeline complexity');
    }

    // Cache hit rate check
    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate) {
      const hitRate = Math.round(this.metrics.cacheHitRate * 100);
      issues.push(`Low cache hit rate: ${hitRate}%`);
      suggestions.push('Allow more time for video preloading or reduce playback speed');
    }

    // Video decoding time check
    if (this.metrics.videoDecodingTime > this.thresholds.maxVideoDecodingTime) {
      issues.push(`Slow video decoding: ${Math.round(this.metrics.videoDecodingTime)}ms`);
      suggestions.push('Try using lower resolution videos or converting to a more efficient codec');
    }

    // Render time check
    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      issues.push(`Slow rendering: ${Math.round(this.metrics.renderTime)}ms`);
      suggestions.push('Reduce the number of timeline elements or disable preview effects');
    }

    return {
      isGood: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Get performance grade (A-F)
   */
  getPerformanceGrade(): string {
    const status = this.getPerformanceStatus();
    const issueCount = status.issues.length;

    if (issueCount === 0) return 'A';
    if (issueCount === 1) return 'B';
    if (issueCount === 2) return 'C';
    if (issueCount === 3) return 'D';
    return 'F';
  }

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End a performance measurement
   */
  endMeasure(name: string): void {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch (error) {
      console.warn(`Failed to measure performance for ${name}:`, error);
    }
  }

  /**
   * Get performance recommendations based on current system
   */
  getRecommendations(): {
    videoSettings: Record<string, unknown>;
    cacheSettings: Record<string, unknown>;
    uiSettings: Record<string, unknown>;
  } {
    const metrics = this.getMetrics();
    const recommendations = {
      videoSettings: {},
      cacheSettings: {},
      uiSettings: {},
    };

    // Video settings recommendations
    if (metrics.frameRate < 20) {
      recommendations.videoSettings = {
        poolSize: 4, // Reduce from 8
        preloadRadius: 2, // Reduce from 3
        maxConcurrentPreloads: 1, // Reduce from 2
      };
    } else if (metrics.frameRate > 50) {
      recommendations.videoSettings = {
        poolSize: 12, // Increase from 8
        preloadRadius: 5, // Increase from 3
        maxConcurrentPreloads: 3, // Increase from 2
      };
    }

    // Cache settings recommendations
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.cacheSettings = {
        maxCacheSize: 100, // Reduce from 150
        cacheResolution: 20, // Reduce from 24
      };
    }

    // UI settings recommendations
    if (metrics.renderTime > 20) {
      recommendations.uiSettings = {
        reducedAnimations: true,
        simplifiedTimeline: true,
      };
    }

    return recommendations;
  }

  /**
   * Cleanup monitoring
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
