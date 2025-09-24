import { MediaElement } from "@/types/timeline";
import { ContentFillProperties } from "./content-fill-properties";

interface MediaPropertiesProps {
  element: MediaElement;
  trackId: string;
}

export function MediaProperties({ element, trackId }: MediaPropertiesProps) {
  return (
    <div className="space-y-4">
      {/* Basic Media Properties */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-2">Media Properties</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Element ID: {element.id}</div>
          <div>Media ID: {element.mediaId}</div>
          <div>Duration: {element.duration.toFixed(2)}s</div>
          <div>Start Time: {element.startTime.toFixed(2)}s</div>
        </div>
      </div>
      
      {/* Content Fill Properties */}
      <ContentFillProperties element={element} trackId={trackId} />
    </div>
  );
}
