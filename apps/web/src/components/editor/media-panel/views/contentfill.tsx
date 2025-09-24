"use client";

import { ContentFillJobsPanel } from "../../content-fill-jobs-panel";
import { ContentFillDemo } from "../../content-fill-demo";
import { ContentFillTestHelper } from "../../content-fill-test-helper";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ContentFillView() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <ContentFillTestHelper />
        <ContentFillDemo />
        <ContentFillJobsPanel />
      </div>
    </ScrollArea>
  );
}
