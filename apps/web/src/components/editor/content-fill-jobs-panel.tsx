"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContentFillStore } from "@/stores/content-fill-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useContentFillService } from "@/lib/content-fill-service";
import { formatTimeCode } from "@/lib/time";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Trash2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ContentFillJobsPanel() {
  const { jobs, removeJob, setActiveJob } = useContentFillStore();
  const { tracks } = useTimelineStore();
  const { mediaFiles } = useMediaStore();
  const { addResultToProject } = useContentFillService();

  const getJobDetails = (job: any) => {
    const track = tracks.find((t) => t.id === job.trackId);
    const element = track?.elements.find((e) => e.id === job.elementId);
    const mediaFile = element?.type === "media" 
      ? mediaFiles.find((f) => f.id === element.mediaId)
      : null;
    
    return {
      track,
      element,
      mediaFile,
      elementName: element?.name || "Unknown Element",
      trackName: track?.name || "Unknown Track",
    };
  };

  const handleDownloadResult = async (jobId: string) => {
    try {
      // This would typically download the result and add it to the project
      const mediaId = await addResultToProject(jobId, "current-project-id"); // TODO: Get actual project ID
      if (mediaId) {
        console.log("Result added to project:", mediaId);
      }
    } catch (error) {
      console.error("Failed to download result:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No content fill jobs yet</p>
        <p className="text-xs">Jobs will appear here when you generate content fill</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Content Fill Jobs</h3>
          <Badge variant="secondary" className="text-xs">
            {jobs.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {jobs.map((job) => {
            const { elementName, trackName } = getJobDetails(job);
            
            return (
              <div
                key={job.id}
                className={cn(
                  "border rounded-lg p-3 space-y-2 cursor-pointer transition-colors",
                  "hover:bg-muted/50"
                )}
                onClick={() => setActiveJob(job.id)}
              >
                {/* Job Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="text-sm font-medium">{elementName}</span>
                  </div>
                  <Badge
                    className={cn("text-xs", getStatusColor(job.status))}
                    variant="secondary"
                  >
                    {job.status}
                  </Badge>
                </div>

                {/* Job Details */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Track: {trackName}</div>
                  <div>Prompt: {job.parameters.prompt.slice(0, 50)}...</div>
                  <div>
                    Created: {formatTimeCode(job.createdAt.getTime() / 1000, "MM:SS")}
                  </div>
                  {job.status === "processing" && (
                    <div className="flex items-center gap-1">
                      <div className="w-full bg-muted rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span>{job.progress}%</span>
                    </div>
                  )}
                </div>

                {/* Job Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    {job.status === "completed" && job.resultUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(job.resultUrl, '_blank');
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadResult(job.id);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          Add to Project
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeJob(job.id);
                    }}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Error Message */}
                {job.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {job.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
