/**
 * Performance Debug Panel - Development tool for monitoring editor performance
 * 
 * This component provides real-time performance metrics and optimization
 * suggestions during development.
 */

"use client";

import { useState, useEffect } from "react";
import { performanceMonitor } from "@/lib/performance-monitor";
import { videoCache } from "@/lib/video-cache";
import { videoPreloader } from "@/lib/video-preloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Monitor, Zap, Database, Video, AlertTriangle, CheckCircle } from "lucide-react";

interface PerformanceDebugProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export function PerformanceDebug({ 
  isVisible = false, 
  onToggle 
}: PerformanceDebugProps) {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [videoStats, setVideoStats] = useState(videoCache.getStats());
  const [preloaderStats, setPreloaderStats] = useState(videoPreloader.getStats());
  const [performanceStatus, setPerformanceStatus] = useState(
    performanceMonitor.getPerformanceStatus()
  );

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setVideoStats(videoCache.getStats());
      setPreloaderStats(videoPreloader.getStats());
      setPerformanceStatus(performanceMonitor.getPerformanceStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
        title="Show Performance Debug"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const performanceGrade = performanceMonitor.getPerformanceGrade();

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto z-50 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Performance Debug
            <Badge className={`${getGradeColor(performanceGrade)} text-white`}>
              {performanceGrade}
            </Badge>
          </CardTitle>
          <Button onClick={onToggle} variant="ghost" size="sm">
            ×
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {/* Overall Status */}
        <div className="flex items-center gap-2">
          {performanceStatus.isGood ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          <span className="font-medium">
            {performanceStatus.isGood ? 'Performance Good' : 'Performance Issues'}
          </span>
        </div>

        <Separator />

        {/* Core Metrics */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span className="font-medium">Core Metrics</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">FPS:</span>
              <span className={`ml-1 ${metrics.frameRate < 24 ? 'text-red-500' : 'text-green-500'}`}>
                {metrics.frameRate}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <span className="ml-1">{formatMemory(metrics.memoryUsage)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cache Hit:</span>
              <span className={`ml-1 ${metrics.cacheHitRate < 0.8 ? 'text-red-500' : 'text-green-500'}`}>
                {Math.round(metrics.cacheHitRate * 100)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Render:</span>
              <span className={`ml-1 ${metrics.renderTime > 16 ? 'text-red-500' : 'text-green-500'}`}>
                {Math.round(metrics.renderTime)}ms
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Video Cache Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Video className="h-3 w-3" />
            <span className="font-medium">Video Cache</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Total Sinks:</span>
              <span className="ml-1">{videoStats.totalSinks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active:</span>
              <span className="ml-1">{videoStats.activeSinks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cached:</span>
              <span className="ml-1">{videoStats.cachedFrames}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Preloader Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span className="font-medium">Preloader</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Queue:</span>
              <span className="ml-1">{preloaderStats.queueLength}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active:</span>
              <span className="ml-1">{preloaderStats.activePreloads}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`ml-1 ${preloaderStats.isPreloading ? 'text-blue-500' : 'text-gray-500'}`}>
                {preloaderStats.isPreloading ? 'Preloading' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Issues and Suggestions */}
        {!performanceStatus.isGood && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="font-medium text-red-600">Issues:</div>
              {performanceStatus.issues.map((issue, index) => (
                <div key={index} className="text-xs text-red-600">
                  • {issue}
                </div>
              ))}
              
              <div className="font-medium text-blue-600">Suggestions:</div>
              {performanceStatus.suggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-blue-600">
                  • {suggestion}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <Separator />
        <div className="flex gap-1">
          <Button
            onClick={() => {
              videoCache.clearAll();
              console.log('Video cache cleared');
            }}
            variant="outline"
            size="sm"
            className="text-xs h-6"
          >
            Clear Cache
          </Button>
          <Button
            onClick={() => {
              videoPreloader.clearQueue();
              console.log('Preloader queue cleared');
            }}
            variant="outline"
            size="sm"
            className="text-xs h-6"
          >
            Clear Queue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for easy integration
export function usePerformanceDebug() {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible(!isVisible);

  return {
    isVisible,
    toggle,
    PerformanceDebugComponent: () => (
      <PerformanceDebug isVisible={isVisible} onToggle={toggle} />
    ),
  };
}
