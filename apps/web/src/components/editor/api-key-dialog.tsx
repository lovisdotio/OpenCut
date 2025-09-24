"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentFillService } from "@/lib/content-fill-service";
import { Settings, Key } from "lucide-react";

export function ApiKeyDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const { setApiKey: setServiceApiKey } = useContentFillService();

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("fal-ai-api-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setServiceApiKey(savedApiKey);
      setHasApiKey(true);
    }
  }, [setServiceApiKey]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("fal-ai-api-key", apiKey.trim());
      setServiceApiKey(apiKey.trim());
      setHasApiKey(true);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem("fal-ai-api-key");
    setApiKey("");
    setHasApiKey(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {hasApiKey ? (
            <>
              <Key className="h-4 w-4 text-green-500" />
              API Key Set
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              Configure API
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>fal.ai API Configuration</DialogTitle>
          <DialogDescription>
            Enter your fal.ai API key to enable content fill functionality.
            You can get your API key from{" "}
            <a
              href="https://fal.ai/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              fal.ai dashboard
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your fal.ai API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between gap-2">
            {hasApiKey && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="text-red-600 hover:text-red-700"
              >
                Clear Key
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!apiKey.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




