"use client";

import { useEffect, useRef, useState } from "react";
import { MaskShape } from "@/types/content-fill";
import { cn } from "@/lib/utils";

interface ContentFillLoadingOverlayProps {
  isProcessing: boolean;
  progress: number;
  masks: MaskShape[];
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
  logs?: string[];
}

export function ContentFillLoadingOverlay({
  isProcessing,
  progress,
  masks,
  width,
  height,
  videoWidth,
  videoHeight,
  logs = [],
}: ContentFillLoadingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  // Convert video coordinates to screen coordinates
  const videoToScreenCoords = (videoX: number, videoY: number) => ({
    x: (videoX / videoWidth) * width,
    y: (videoY / videoHeight) * height,
  });

  // Animation loop for the processing effect
  useEffect(() => {
    if (!isProcessing) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setAnimationPhase((prev) => (prev + 0.02) % (Math.PI * 2));
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isProcessing]);

  // Cycle through logs
  useEffect(() => {
    if (!isProcessing || logs.length === 0) return;

    const interval = setInterval(() => {
      setCurrentLogIndex((prev) => (prev + 1) % logs.length);
    }, 2000); // Change log every 2 seconds

    return () => clearInterval(interval);
  }, [isProcessing, logs.length]);

  // Draw the animated overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isProcessing) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw animated effects for each mask
    masks.forEach((mask, index) => {
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const start = videoToScreenCoords(mask.points[0].x, mask.points[0].y);
        const end = videoToScreenCoords(mask.points[1].x, mask.points[1].y);
        
        const rectX = Math.min(start.x, end.x);
        const rectY = Math.min(start.y, end.y);
        const rectWidth = Math.abs(end.x - start.x);
        const rectHeight = Math.abs(end.y - start.y);

        // Animated blur effect
        const blurIntensity = 3 + Math.sin(animationPhase + index) * 2;
        ctx.filter = `blur(${blurIntensity}px)`;
        
        // Pulsing opacity
        const opacity = 0.3 + Math.sin(animationPhase * 2 + index) * 0.2;
        ctx.fillStyle = `rgba(100, 200, 255, ${opacity})`;
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        // Reset filter for border
        ctx.filter = "none";
        
        // Animated border
        const borderOpacity = 0.5 + Math.sin(animationPhase * 3 + index) * 0.3;
        ctx.strokeStyle = `rgba(0, 150, 255, ${borderOpacity})`;
        ctx.lineWidth = 2 + Math.sin(animationPhase + index) * 1;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = animationPhase * 10;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        ctx.setLineDash([]);

        // Scanning line effect
        const scanY = rectY + (rectHeight * ((animationPhase % Math.PI) / Math.PI));
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rectX, scanY);
        ctx.lineTo(rectX + rectWidth, scanY);
        ctx.stroke();

        // Particle effect
        for (let i = 0; i < 5; i++) {
          const particleX = rectX + Math.random() * rectWidth;
          const particleY = rectY + Math.random() * rectHeight;
          const particleSize = 1 + Math.sin(animationPhase * 4 + i) * 1;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(animationPhase * 2 + i) * 0.3})`;
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }, [animationPhase, masks, width, height, videoWidth, videoHeight, isProcessing]);

  // Debug logging
  console.log("Loading overlay render:", {
    isProcessing,
    progress,
    masksCount: masks.length,
    logsCount: logs.length
  });

  if (!isProcessing) {
    return null;
  }

  const currentLog = logs[currentLogIndex] || "Processing...";
  const cleanLog = currentLog.replace(/^\d+%\|[█▎▋▊▉▌▍▏\s]*\|/, "").trim();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Animated canvas overlay */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      />

      {/* Progress and log overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-md">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">AI Processing</span>
              <span className="text-sm text-blue-300">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Animated shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12"
                  style={{
                    animation: "shimmer 2s infinite",
                    transform: `translateX(${Math.sin(animationPhase) * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Current log message */}
          <div className="text-xs text-gray-300 font-mono">
            {cleanLog}
          </div>

          {/* Processing stage indicator */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    Math.sin(animationPhase + i * 0.5) > 0
                      ? "bg-blue-400 scale-110"
                      : "bg-gray-600 scale-90"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {progress < 30 ? "Preparing..." : 
               progress < 50 ? "Uploading..." : 
               progress < 90 ? "Generating..." : "Finalizing..."}
            </span>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
}
