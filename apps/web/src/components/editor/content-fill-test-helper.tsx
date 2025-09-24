"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContentFillStore } from "@/stores/content-fill-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export function ContentFillTestHelper() {
  const { maskDrawing, parameters, jobs, createJob, updateJob } = useContentFillStore();
  const { selectedElements, tracks } = useTimelineStore();
  const { mediaFiles } = useMediaStore();

  // Test functions
  const addTestMask = () => {
    const testMask = {
      id: `test_mask_${Date.now()}`,
      type: "rectangle" as const,
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ],
      frame: 0,
    };
    useContentFillStore.getState().addMask(testMask);
  };

  const createTestJob = async () => {
    const jobId = await createJob("test-element", "test-track", maskDrawing.masks);
    
    // Simulate job progression
    setTimeout(() => updateJob(jobId, { status: "processing", progress: 25 }), 1000);
    setTimeout(() => updateJob(jobId, { status: "processing", progress: 50 }), 2000);
    setTimeout(() => updateJob(jobId, { status: "processing", progress: 75 }), 3000);
    setTimeout(() => updateJob(jobId, { 
      status: "completed", 
      progress: 100, 
      resultUrl: "https://example.com/result.mp4",
      completedAt: new Date()
    }), 4000);
  };

  const createFailedJob = async () => {
    const jobId = await createJob("test-element-fail", "test-track", maskDrawing.masks);
    setTimeout(() => updateJob(jobId, { 
      status: "failed", 
      progress: 0, 
      error: "Test error: API key invalid"
    }), 2000);
  };

  // Check current state
  const hasVideoElements = selectedElements.some(({ trackId, elementId }) => {
    const track = tracks.find(t => t.id === trackId);
    const element = track?.elements.find(e => e.id === elementId);
    const mediaFile = element?.type === "media" 
      ? mediaFiles.find(f => f.id === element.mediaId)
      : null;
    return element?.type === "media" && mediaFile?.type === "video";
  });

  const hasApiKey = typeof window !== "undefined" && localStorage.getItem("fal-ai-api-key");
  const hasMasks = maskDrawing.masks.length > 0;
  const hasPrompt = parameters.prompt.trim().length > 0;

  const canGenerate = hasVideoElements && hasMasks && hasPrompt && hasApiKey;

  return (
    <Card className="m-4 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">🧪 Content Fill Test Helper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State Checks */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            {hasVideoElements ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Video Element Selected
          </div>
          
          <div className="flex items-center gap-2">
            {hasApiKey ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            API Key Configured
          </div>
          
          <div className="flex items-center gap-2">
            {hasMasks ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Masks Drawn ({maskDrawing.masks.length})
          </div>
          
          <div className="flex items-center gap-2">
            {hasPrompt ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Prompt Entered
          </div>
        </div>

        {/* Generation Status */}
        <div className="flex items-center gap-2 p-2 bg-white rounded">
          {canGenerate ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700">Ready to Generate!</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-orange-700">Missing requirements above</span>
            </>
          )}
        </div>

        {/* Test Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-blue-800">Test Actions:</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addTestMask}
            >
              Add Test Mask
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={createTestJob}
              disabled={maskDrawing.masks.length === 0}
            >
              Simulate Successful Job
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={createFailedJob}
              disabled={maskDrawing.masks.length === 0}
            >
              Simulate Failed Job
            </Button>
          </div>
        </div>

        {/* Current Jobs Status */}
        <div>
          <h4 className="font-medium text-blue-800">Current Jobs: {jobs.length}</h4>
          <div className="flex flex-wrap gap-1">
            {jobs.map(job => (
              <Badge key={job.id} variant="outline" className="text-xs">
                {job.status} ({job.progress}%)
              </Badge>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          <strong>Quick Test:</strong> Add test mask → Set prompt → Click "Generate Content Fill" in Properties Panel
        </div>
      </CardContent>
    </Card>
  );
}
