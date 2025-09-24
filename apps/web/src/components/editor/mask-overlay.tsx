"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useContentFillStore } from "@/stores/content-fill-store";
import { MaskShape, MaskPoint } from "@/types/content-fill";
import { cn } from "@/lib/utils";

interface MaskOverlayProps {
  width: number;
  height: number;
  canvasSize: { width: number; height: number };
  videoWidth: number;  // Real video width
  videoHeight: number; // Real video height
  isVisible?: boolean;
}

export function MaskOverlay({
  width,
  height,
  canvasSize,
  videoWidth,
  videoHeight,
  isVisible = true,
}: MaskOverlayProps) {
  const {
    maskDrawing,
    setDrawingTool,
    addMask,
    updateMask,
  } = useContentFillStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<MaskShape | null>(null);

  const scaleX = width / canvasSize.width;
  const scaleY = height / canvasSize.height;

  // Convert screen coordinates to actual video coordinates
  const screenToVideoCoords = useCallback(
    (screenX: number, screenY: number): MaskPoint => {
      console.log("Converting screen to video:", {
        screenX, screenY,
        previewSize: { width, height },
        videoSize: { videoWidth, videoHeight }
      });
      
      const result = {
        x: (screenX / width) * videoWidth,
        y: (screenY / height) * videoHeight,
      };
      
      console.log("Converted to video coords:", result);
      return result;
    },
    [width, height, videoWidth, videoHeight]
  );

  // Convert video coordinates to screen coordinates for display
  const videoToScreenCoords = useCallback(
    (videoX: number, videoY: number): MaskPoint => ({
      x: (videoX / videoWidth) * width,
      y: (videoY / videoHeight) * height,
    }),
    [width, height, videoWidth, videoHeight]
  );

  // Draw masks on canvas
  const drawMasks = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isVisible || !maskDrawing.isVisible) return;

    // Draw existing masks
    maskDrawing.masks.forEach((mask) => {
      drawMask(ctx, mask);
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawMask(ctx, currentShape);
    }
  }, [width, height, isVisible, maskDrawing.masks, maskDrawing.isVisible, currentShape]);

  const drawMask = (ctx: CanvasRenderingContext2D, mask: MaskShape) => {
    ctx.save();
    
    // Set mask appearance
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; // Semi-transparent red
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)"; // Red border
    ctx.lineWidth = 2;

    if (mask.type === "rectangle" && mask.points.length >= 2) {
      const start = videoToScreenCoords(mask.points[0].x, mask.points[0].y);
      const end = videoToScreenCoords(mask.points[1].x, mask.points[1].y);
      
      const rectX = Math.min(start.x, end.x);
      const rectY = Math.min(start.y, end.y);
      const rectWidth = Math.abs(end.x - start.x);
      const rectHeight = Math.abs(end.y - start.y);

      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    } else if (mask.type === "brush" && mask.points.length > 1) {
      ctx.beginPath();
      const firstPoint = videoToScreenCoords(mask.points[0].x, mask.points[0].y);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      for (let i = 1; i < mask.points.length; i++) {
        const point = videoToScreenCoords(mask.points[i].x, mask.points[i].y);
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.lineWidth = mask.strokeWidth || maskDrawing.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.restore();
  };

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskDrawing.currentTool) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const videoPoint = screenToVideoCoords(x, y);

    console.log("Mouse down - Screen coords:", { x, y });
    console.log("Mouse down - Video coords:", videoPoint);
    console.log("Canvas size:", canvasSize);
    console.log("Preview size:", { width, height });

    const shapeId = `mask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (maskDrawing.currentTool === "rectangle") {
      const newShape: MaskShape = {
        id: shapeId,
        type: "rectangle",
        points: [videoPoint, videoPoint], // Start and end point (same initially)
        frame: 0, // TODO: Get current frame from playback store
      };
      
      setCurrentShape(newShape);
      setIsDrawing(true);
    } else if (maskDrawing.currentTool === "brush") {
      const newShape: MaskShape = {
        id: shapeId,
        type: "brush",
        points: [videoPoint],
        frame: 0, // TODO: Get current frame from playback store
        strokeWidth: maskDrawing.strokeWidth,
      };
      
      setCurrentShape(newShape);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const videoPoint = screenToVideoCoords(x, y);

    if (currentShape.type === "rectangle") {
      // Update the second point for rectangle
      setCurrentShape({
        ...currentShape,
        points: [currentShape.points[0], videoPoint],
      });
    } else if (currentShape.type === "brush") {
      // Add point to brush stroke
      setCurrentShape({
        ...currentShape,
        points: [...currentShape.points, videoPoint],
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;

    // Add the completed shape to the store
    addMask(currentShape);
    
    // Reset drawing state
    setCurrentShape(null);
    setIsDrawing(false);
  };

  // Handle mouse leave to complete drawing
  const handleMouseLeave = () => {
    if (isDrawing && currentShape) {
      handleMouseUp();
    }
  };

  // Redraw canvas when masks change
  useEffect(() => {
    drawMasks();
  }, [drawMasks]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawingTool(null);
        setCurrentShape(null);
        setIsDrawing(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setDrawingTool]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn(
        "absolute inset-0 pointer-events-none",
        maskDrawing.currentTool && "pointer-events-auto cursor-crosshair",
        !isVisible && "hidden"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
