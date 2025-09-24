"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useContentFillStore } from "@/stores/content-fill-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useContentFillService } from "@/lib/content-fill-service";
import { ApiKeyDialog } from "../api-key-dialog";
import { ContentFillSuccess } from "../content-fill-success";
import { MaskDebugViewer } from "../mask-debug-viewer";
import { MaskedVideoPreview } from "../masked-video-preview";
import { MediaElement } from "@/types/timeline";
import { MediaFile } from "@/types/media";
import { PropertyItem, PropertyItemLabel, PropertyItemValue } from "./property-item";
import {
  Square,
  Brush,
  Eraser,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ContentFillPropertiesProps {
  element: MediaElement;
  trackId: string;
}

export function ContentFillProperties({
  element,
  trackId,
}: ContentFillPropertiesProps) {
  const { mediaFiles } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { processContentFill } = useContentFillService();
  const {
    maskDrawing,
    parameters,
    jobs,
    activeJobId,
    setDrawingTool,
    toggleMaskVisibility,
    setStrokeWidth,
    clearMasks,
    updateParameters,
    createJob,
    setActiveJob,
    cleanupOldJobs,
  } = useContentFillStore();

  const [isAdvanced, setIsAdvanced] = useState(false);

  // Get the media file for this element
  const mediaFile = mediaFiles.find((file) => file.id === element.mediaId);
  const isVideoFile = mediaFile?.type === "video";

  // Get active job for this element
  const elementJob = jobs.find(
    (job) => job.elementId === element.id && job.trackId === trackId
  );

  const handleGenerateContentFill = async () => {
    if (maskDrawing.masks.length === 0) {
      // Show error - no masks drawn
      return;
    }

    if (!activeProject) {
      console.error("No active project");
      return;
    }

    try {
      // Clean up any old jobs for this element first
      cleanupOldJobs(element.id, trackId);
      
      console.log("Starting content fill for element:", element.id, "track:", trackId);
      
      // Start actual processing with the service (it will create the job)
      await processContentFill({
        elementId: element.id,
        trackId: trackId,
        masks: maskDrawing.masks,
      });
    } catch (error) {
      console.error("Failed to process content fill:", error);
    }
  };

  const canGenerate = 
    isVideoFile && 
    maskDrawing.masks.length > 0 && 
    parameters.prompt.trim().length > 0 &&
    (!elementJob || elementJob.status === "completed" || elementJob.status === "failed");

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Content Fill</h3>
        <div className="flex items-center gap-2">
          <ApiKeyDialog />
          {!isVideoFile && (
            <Badge variant="secondary" className="text-xs">
              Video Only
            </Badge>
          )}
        </div>
      </div>

      {!isVideoFile ? (
        <div className="text-sm text-muted-foreground">
          Content fill is only available for video elements.
        </div>
      ) : (
        <>
          {/* Mask Drawing Tools */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Mask Tools
            </Label>
            
            <div className="flex items-center gap-2">
              <Button
                variant={maskDrawing.currentTool === "rectangle" ? "default" : "outline"}
                size="sm"
                onClick={() => 
                  setDrawingTool(
                    maskDrawing.currentTool === "rectangle" ? null : "rectangle"
                  )
                }
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-1" />
                Rectangle
              </Button>
              
              <Button
                variant={maskDrawing.currentTool === "brush" ? "default" : "outline"}
                size="sm"
                onClick={() => 
                  setDrawingTool(
                    maskDrawing.currentTool === "brush" ? null : "brush"
                  )
                }
                className="flex-1"
              >
                <Brush className="h-4 w-4 mr-1" />
                Brush
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMaskVisibility}
                className="flex-1"
              >
                {maskDrawing.isVisible ? (
                  <Eye className="h-4 w-4 mr-1" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-1" />
                )}
                {maskDrawing.isVisible ? "Hide" : "Show"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearMasks}
                disabled={maskDrawing.masks.length === 0}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {maskDrawing.currentTool === "brush" && (
              <PropertyItem>
                <PropertyItemLabel>Brush Size</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[maskDrawing.strokeWidth]}
                      onValueChange={([value]) => setStrokeWidth(value)}
                      min={5}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {maskDrawing.strokeWidth}
                    </span>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            )}

            {maskDrawing.masks.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {maskDrawing.masks.length} mask{maskDrawing.masks.length !== 1 ? "s" : ""} drawn
              </div>
            )}
          </div>

          {/* Debug Viewers */}
          {maskDrawing.masks.length > 0 && mediaFile && (
            <>
              <MaskDebugViewer 
                videoWidth={mediaFile.width || 1920}
                videoHeight={mediaFile.height || 1080}
              />
              <MaskedVideoPreview
                sourceVideo={mediaFile.file}
                masks={maskDrawing.masks}
                videoWidth={mediaFile.width || 1920}
                videoHeight={mediaFile.height || 1080}
              />
            </>
          )}

          <Separator />

          {/* AI Parameters */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              AI Parameters
            </Label>

            <PropertyItem direction="column">
              <PropertyItemLabel>Prompt</PropertyItemLabel>
              <PropertyItemValue>
                <Textarea
                  placeholder="Describe what should fill the masked area..."
                  value={parameters.prompt}
                  onChange={(e) => updateParameters({ prompt: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </PropertyItemValue>
            </PropertyItem>

            <PropertyItem>
              <PropertyItemLabel>Strength</PropertyItemLabel>
              <PropertyItemValue>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[parameters.strength]}
                    onValueChange={([value]) => updateParameters({ strength: value })}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {parameters.strength.toFixed(1)}
                  </span>
                </div>
              </PropertyItemValue>
            </PropertyItem>

            <PropertyItem>
              <PropertyItemLabel>Resolution</PropertyItemLabel>
              <PropertyItemValue>
                <Select
                  value={parameters.resolution}
                  onValueChange={(value: "480p" | "580p" | "720p") =>
                    updateParameters({ resolution: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="580p">580p</SelectItem>
                    <SelectItem value="720p">720p (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </PropertyItemValue>
            </PropertyItem>

            {/* Advanced Parameters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvanced(!isAdvanced)}
              className="w-full justify-start text-xs text-muted-foreground"
            >
              {isAdvanced ? "Hide" : "Show"} Advanced Parameters
            </Button>

            {isAdvanced && (
              <div className="space-y-3 pt-2">
                <PropertyItem direction="column">
                  <PropertyItemLabel>Negative Prompt</PropertyItemLabel>
                  <PropertyItemValue>
                    <Textarea
                      placeholder="What to avoid in the generation..."
                      value={parameters.negativePrompt}
                      onChange={(e) => updateParameters({ negativePrompt: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>Inference Steps</PropertyItemLabel>
                  <PropertyItemValue>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[parameters.numInferenceSteps]}
                        onValueChange={([value]) => updateParameters({ numInferenceSteps: value })}
                        min={10}
                        max={50}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {parameters.numInferenceSteps}
                      </span>
                    </div>
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>Guidance Scale</PropertyItemLabel>
                  <PropertyItemValue>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[parameters.guidanceScale]}
                        onValueChange={([value]) => updateParameters({ guidanceScale: value })}
                        min={1}
                        max={20}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {parameters.guidanceScale}
                      </span>
                    </div>
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>Frames</PropertyItemLabel>
                  <PropertyItemValue>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[parameters.numFrames]}
                        onValueChange={([value]) => updateParameters({ numFrames: value })}
                        min={81}
                        max={241}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {parameters.numFrames}
                      </span>
                    </div>
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>FPS</PropertyItemLabel>
                  <PropertyItemValue>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[parameters.framesPerSecond]}
                        onValueChange={([value]) => updateParameters({ framesPerSecond: value })}
                        min={5}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {parameters.framesPerSecond}
                      </span>
                    </div>
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>Seed</PropertyItemLabel>
                  <PropertyItemValue>
                    <Input
                      type="number"
                      placeholder="Random"
                      value={parameters.seed || ""}
                      onChange={(e) => 
                        updateParameters({ 
                          seed: e.target.value ? parseInt(e.target.value) : undefined 
                        })
                      }
                    />
                  </PropertyItemValue>
                </PropertyItem>

                <PropertyItem>
                  <PropertyItemLabel>Aspect Ratio</PropertyItemLabel>
                  <PropertyItemValue>
                    <Select
                      value={parameters.aspectRatio}
                      onValueChange={(value: "auto" | "16:9" | "1:1" | "9:16") =>
                        updateParameters({ aspectRatio: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                      </SelectContent>
                    </Select>
                  </PropertyItemValue>
                </PropertyItem>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="safety-checker"
                      checked={parameters.enableSafetyChecker}
                      onCheckedChange={(checked) =>
                        updateParameters({ enableSafetyChecker: !!checked })
                      }
                    />
                    <Label htmlFor="safety-checker" className="text-sm">
                      Enable Safety Checker
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prompt-expansion"
                      checked={parameters.enablePromptExpansion}
                      onCheckedChange={(checked) =>
                        updateParameters({ enablePromptExpansion: !!checked })
                      }
                    />
                    <Label htmlFor="prompt-expansion" className="text-sm">
                      Enable Prompt Expansion
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Generate Button & Job Status */}
          <div className="space-y-3">
            <Button
              onClick={handleGenerateContentFill}
              disabled={!canGenerate}
              className="w-full"
              size="sm"
            >
              {elementJob?.status === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing... ({elementJob.progress}%)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Content Fill
                </>
              )}
            </Button>

            {!canGenerate && (
              <div className="text-xs text-muted-foreground text-center">
                {maskDrawing.masks.length === 0 && "Draw a mask first"}
                {maskDrawing.masks.length > 0 && !parameters.prompt.trim() && "Enter a prompt"}
                {elementJob?.status === "processing" && "Processing in progress..."}
              </div>
            )}

            {/* Job Status */}
            {elementJob && (
              <>
                {elementJob.status === "completed" && elementJob.resultUrl ? (
                  <ContentFillSuccess
                    resultUrl={elementJob.resultUrl}
                    prompt={elementJob.parameters.prompt}
                    processingTime={elementJob.completedAt && elementJob.createdAt ? 
                      (elementJob.completedAt.getTime() - elementJob.createdAt.getTime()) / 1000 : 
                      undefined
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    {elementJob.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {elementJob.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {elementJob.status === "failed" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    
                    <div className="flex-1">
                      <div className="text-xs font-medium capitalize">
                        {elementJob.status}
                      </div>
                      {elementJob.status === "processing" && (
                        <div className="text-xs text-muted-foreground">
                          {elementJob.progress}% complete
                        </div>
                      )}
                      {elementJob.error && (
                        <div className="text-xs text-red-500">
                          {elementJob.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
