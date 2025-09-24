"use client";

import { useEffect, useRef } from "react";
import { useContentFillStore } from "@/stores/content-fill-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MaskDebugViewerProps {
  videoWidth: number;
  videoHeight: number;
}

export function MaskDebugViewer({ videoWidth, videoHeight }: MaskDebugViewerProps) {
  const { maskDrawing } = useContentFillStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateDebugMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to video dimensions
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Clear with black
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, videoWidth, videoHeight);

    // Draw masks in white
    ctx.fillStyle = "white";
    maskDrawing.masks.forEach((mask, index) => {
      console.log(`Debug mask ${index}:`, mask);
      
      if (mask.type === "rectangle" && mask.points.length >= 2) {
        const x = Math.min(mask.points[0].x, mask.points[1].x);
        const y = Math.min(mask.points[0].y, mask.points[1].y);
        const width = Math.abs(mask.points[1].x - mask.points[0].x);
        const height = Math.abs(mask.points[1].y - mask.points[0].y);
        
        console.log(`Debug rectangle: x=${x}, y=${y}, w=${width}, h=${height}`);
        console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
        console.log(`Percentage of video: x=${(x/videoWidth*100).toFixed(1)}%, y=${(y/videoHeight*100).toFixed(1)}%, w=${(width/videoWidth*100).toFixed(1)}%, h=${(height/videoHeight*100).toFixed(1)}%`);
        
        ctx.fillRect(x, y, width, height);
        
        // Draw border for visibility
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      }
    });
  };

  const downloadMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'debug_mask.png';
    link.click();
  };

  useEffect(() => {
    generateDebugMask();
  }, [maskDrawing.masks, videoWidth, videoHeight]);

  if (maskDrawing.masks.length === 0) {
    return null;
  }

  return (
    <Card className="m-4 border-blue-200">
      <CardHeader>
        <CardTitle className="text-sm">🔍 Mask Debug Viewer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Video: {videoWidth}x{videoHeight} • Masks: {maskDrawing.masks.length}
        </div>
        
        <canvas
          ref={canvasRef}
          className="border border-gray-300 max-w-full h-auto"
          style={{ maxHeight: "200px" }}
        />
        
        <div className="flex gap-2">
          <Button size="sm" onClick={generateDebugMask}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={downloadMask}>
            Download Mask
          </Button>
        </div>
        
        <div className="text-xs text-blue-600">
          Black = Keep, White = Inpaint. This is exactly what gets sent to fal.ai.
        </div>
      </CardContent>
    </Card>
  );
}
