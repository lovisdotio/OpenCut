"use client";

import { useContentFillStore } from "@/stores/content-fill-store";

export function FalAiBadge() {
  const { jobs } = useContentFillStore();
  
  // Show the badge always in the editor (Content Fill is available)
  const processingJobs = jobs.filter(job => job.status === "processing");
  const completedJobs = jobs.filter(job => job.status === "completed");

  return (
    <a
      href="https://fal.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 backdrop-blur-sm rounded-lg border border-purple-200/30 shadow-sm transition-all duration-200 hover:shadow-md group"
      title="Content Fill powered by fal.ai"
    >
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        Powered by
      </span>
      <img
        src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/fal-color.png"
        alt="fal.ai"
        className="h-5 w-auto group-hover:scale-110 transition-transform duration-200"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.parentElement?.querySelector('.fallback-text') as HTMLElement;
          if (fallback) {
            fallback.style.display = 'inline';
          }
        }}
      />
      <span className="text-xs font-medium text-purple-600 hidden fallback-text">fal.ai</span>
      
      {/* Status indicators */}
      {processingJobs.length > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-600 font-medium">{processingJobs.length}</span>
        </div>
      )}
      {completedJobs.length > 0 && processingJobs.length === 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-green-600 font-medium">{completedJobs.length}</span>
        </div>
      )}
    </a>
  );
}
