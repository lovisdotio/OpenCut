"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, ExternalLink, Play } from "lucide-react";

interface ContentFillSuccessProps {
  resultUrl: string;
  prompt: string;
  processingTime?: number;
}

export function ContentFillSuccess({ 
  resultUrl, 
  prompt, 
  processingTime 
}: ContentFillSuccessProps) {
  const handleDownload = () => {
    window.open(resultUrl, '_blank');
  };

  const handlePreview = () => {
    // Create a preview modal or open in new tab
    window.open(resultUrl, '_blank');
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Content Fill Completed!
        </CardTitle>
        <CardDescription className="text-green-700">
          Your video has been successfully processed with AI in-painting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Prompt:</span>
            <Badge variant="outline" className="text-green-700">
              {prompt.slice(0, 20)}...
            </Badge>
          </div>
          
          {processingTime && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing Time:</span>
              <Badge variant="outline" className="text-green-700">
                {Math.round(processingTime)}s
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge className="bg-green-600 text-white">
              Ready to Use
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handlePreview}
            size="sm"
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-1" />
            Preview Result
          </Button>
          
          <Button 
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>

        <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
          <strong>✅ Success!</strong> The result has been automatically added to your Media panel. 
          You can now drag it to the timeline to use it in your project.
        </div>
      </CardContent>
    </Card>
  );
}




