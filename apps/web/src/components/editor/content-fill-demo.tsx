"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useContentFillStore } from "@/stores/content-fill-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Brush, BotIcon } from "lucide-react";

export function ContentFillDemo() {
  const { maskDrawing, parameters, jobs } = useContentFillStore();
  const { selectedElements, tracks } = useTimelineStore();
  const { mediaFiles } = useMediaStore();

  // Get selected video elements
  const selectedVideoElements = selectedElements
    .map(({ trackId, elementId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);
      const mediaFile = element?.type === "media" 
        ? mediaFiles.find((f) => f.id === element.mediaId)
        : null;
      return { element, track, mediaFile };
    })
    .filter(({ element, mediaFile }) => 
      element?.type === "media" && mediaFile?.type === "video"
    );

  const activeJobs = jobs.filter(job => job.status === "processing");
  const completedJobs = jobs.filter(job => job.status === "completed");

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="h-5 w-5" />
          Content Fill Integration Demo
        </CardTitle>
        <CardDescription>
          Your BALEC video in-painting solution is now integrated into OpenCut!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {selectedVideoElements.length}
            </div>
            <div className="text-sm text-muted-foreground">Video Elements</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {maskDrawing.masks.length}
            </div>
            <div className="text-sm text-muted-foreground">Masks Drawn</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {activeJobs.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Jobs</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {completedJobs.length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Features Implemented */}
        <div>
          <h4 className="font-medium mb-2">✅ Features Implemented</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-green-500" />
              Rectangle mask drawing
            </div>
            <div className="flex items-center gap-2">
              <Brush className="h-4 w-4 text-green-500" />
              Brush mask drawing
            </div>
            <div className="flex items-center gap-2">
              <BotIcon className="h-4 w-4 text-green-500" />
              fal.ai WAN VACE 14B integration
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              Job management system
            </div>
          </div>
        </div>

        {/* Current AI Parameters */}
        {parameters.prompt && (
          <div>
            <h4 className="font-medium mb-2">Current AI Parameters</h4>
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div><strong>Prompt:</strong> {parameters.prompt}</div>
              <div><strong>Resolution:</strong> {parameters.resolution}</div>
              <div><strong>Strength:</strong> {parameters.strength}</div>
              <div><strong>Steps:</strong> {parameters.numInferenceSteps}</div>
            </div>
          </div>
        )}

        {/* How to Use */}
        <div>
          <h4 className="font-medium mb-2">🚀 How to Use</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Import a video file to your project</li>
            <li>Add the video to the timeline</li>
            <li>Select the video element (it will show in Properties Panel)</li>
            <li>Configure your fal.ai API key in the Content Fill section</li>
            <li>Use Rectangle or Brush tools to draw masks on the preview</li>
            <li>Set your AI prompt and parameters</li>
            <li>Click "Generate Content Fill" to process</li>
            <li>Monitor progress in the Content Fill jobs panel</li>
          </ol>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-green-600">
            Mask Drawing: Ready
          </Badge>
          <Badge variant="outline" className="text-blue-600">
            fal.ai Integration: Ready
          </Badge>
          <Badge variant="outline" className="text-purple-600">
            Job Management: Active
          </Badge>
          {maskDrawing.masks.length > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {maskDrawing.masks.length} Mask{maskDrawing.masks.length !== 1 ? 's' : ''} Ready
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
