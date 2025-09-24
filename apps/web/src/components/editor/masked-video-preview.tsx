"use client";

import { useEffect, useRef } from "react";
import { MaskShape } from "@/types/content-fill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MaskedVideoPreviewProps {
  sourceVideo: File;
  masks: MaskShape[];
  videoWidth: number;
  videoHeight: number;
}

export function MaskedVideoPreview({ 
  sourceVideo, 
  masks, 
  videoWidth, 
  videoHeight 
}: MaskedVideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const generatePreview = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Wait for video to load
    video.src = URL.createObjectURL(sourceVideo);
    await new Promise((resolve) => {
      video.onloadeddata = resolve;
    });

    // Draw video frame
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Draw grey overlay for masks (completely opaque)
    ctx.fillStyle = "rgb(128, 128, 128)";
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
  };

  const downloadPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'masked_source_preview.png';
    link.click();
  };

  useEffect(() => {
    generatePreview();
  }, [sourceVideo, masks, videoWidth, videoHeight]);

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="text-sm">📹 Masked Source Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          This is what gets sent to fal.ai as the source video (with grey overlay)
        </div>
        
        <canvas
          ref={canvasRef}
          className="border border-gray-300 max-w-full h-auto"
          style={{ maxHeight: "200px" }}
        />
        
        <video ref={videoRef} style={{ display: "none" }} />
        
        <div className="flex gap-2">
          <Button size="sm" onClick={generatePreview}>
            Refresh Preview
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPreview}>
            Download Preview
          </Button>
        </div>
        
        <div className="text-xs text-orange-600">
          Grey areas = Where AI will inpaint. This matches your After Effects plugin workflow.
        </div>
      </CardContent>
    </Card>
  );
}
