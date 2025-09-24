// fal.ai client implementation based on the After Effects plugin
// This mirrors the exact implementation from your working plugin

interface FalApiResponse {
  video?: {
    url: string;
  };
  prompt?: string;
  seed?: number;
}

interface FalQueueResponse {
  request_id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: Array<{ message: string; level: string; timestamp: string }>;
}

interface FalStatusResponse {
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: Array<{ message: string; level: string; timestamp: string }>;
  output?: FalApiResponse;
  error?: string;
}

export class FalClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Upload file via our API route
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/content-fill/upload", {
      method: "POST",
      headers: {
        "x-fal-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Upload failed:", errorData);
      throw new Error(`Failed to upload file: ${errorData.error}`);
    }

    const result = await response.json();
    console.log("Upload result:", result);
    return result.file_url || result.url;
  }

  // Submit job via our API route (returns completed result)
  async submitJob(payload: any): Promise<FalApiResponse> {
    console.log("Submitting job with payload:", payload);

    const response = await fetch("/api/content-fill/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fal-api-key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Job submission failed:", errorData);
      throw new Error(`Failed to submit job: ${errorData.error}`);
    }

    const result: FalApiResponse = await response.json();
    console.log("Job completed:", result);
    return result;
  }

  // Get job status via our API route
  async getJobStatus(requestId: string): Promise<FalStatusResponse> {
    const response = await fetch(`/api/content-fill/status/${requestId}`, {
      method: "GET",
      headers: {
        "x-fal-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get job status: ${errorData.error}`);
    }

    const result: FalStatusResponse = await response.json();
    return result;
  }

  // Get job result via our API route
  async getJobResult(requestId: string): Promise<FalApiResponse> {
    const response = await fetch(`/api/content-fill/result/${requestId}`, {
      method: "GET",
      headers: {
        "x-fal-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get job result: ${errorData.error}`);
    }

    const result: FalApiResponse = await response.json();
    return result;
  }

  // Poll job until completion (like in your After Effects plugin)
  async pollJobUntilComplete(
    requestId: string, 
    onProgress?: (status: FalStatusResponse) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<FalApiResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(requestId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === "COMPLETED") {
        if (status.output) {
          return status.output;
        }
        // If no output in status, fetch the full result
        return await this.getJobResult(requestId);
      }

      if (status.status === "FAILED") {
        throw new Error(status.error || "Job failed");
      }

      // Still in progress, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error("Job timed out");
  }
}
