import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImageEditorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (newImageUrl: string) => Promise<void>;
}

export function ImageEditor({ imageUrl, open, onClose, onSave }: ImageEditorProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState<"dall-e" | "flux" | "imagen3">("dall-e");
  const [modelDialogOpen, setModelDialogOpen] = React.useState(false);
  const [generatedImages, setGeneratedImages] = React.useState<string[]>([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [generationLoading, setGenerationLoading] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const initCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found during initialization");
      return;
    }

    canvas.width = 1024;
    canvas.height = 1024;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get canvas context during initialization");
      return;
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const loadImage = React.useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found during image load");
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get canvas context during image load");
      setError("Could not initialize canvas");
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        canvas.width = 1024;
        canvas.height = 1024;

        ctx.clearRect(0, 0, 1024, 1024);

        const scale = Math.min(1024 / img.naturalWidth, 1024 / img.naturalHeight);
        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;

        const offsetX = (1024 - scaledWidth) / 2;
        const offsetY = (1024 - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        resolve();
      };

      img.onerror = (err) => {
        console.error("Image load error:", err);
        reject(new Error("Failed to load image"));
      };

      try {
        const url = new URL(imageUrl, window.location.origin);
        img.src = url.href;
      } catch (err) {
        reject(new Error("Invalid image URL"));
      }
    });
  }, [imageUrl]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 1024 / rect.width;
    const scaleY = 1024 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20 * scaleX, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleResetEraser = React.useCallback(() => {
    loadImage().catch(err => {
      console.error("Failed to reset:", err);
      setError(err instanceof Error ? err.message : "Failed to reset canvas");
    });
  }, [loadImage]);

  const handleGenerateClick = () => {
    if (!prompt) {
      toast({
        title: "Error",
        description: "Please enter a prompt for the edit",
        variant: "destructive",
      });
      return;
    }
    setModelDialogOpen(true);
  };

  const handleModelSelect = async () => {
    setIsLoading(true);
    setError(null);
    setGenerationLoading(true);
    setLoadingProgress(0);

    toast({
      title: "Processing Images",
      description: `Using ${selectedModel} to generate multiple variations. This process takes around 2 minutes...`,
      duration: 10000,
    });

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      const imageData = canvas.toDataURL('image/png');

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 1024;
      maskCanvas.height = 1024;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) throw new Error("Could not create mask context");

      maskCtx.drawImage(canvas, 0, 0);
      const maskData = maskCanvas.toDataURL('image/png');

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          mask: maskData,
          prompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (!data.urls || data.urls.length === 0) {
        throw new Error("No images generated");
      }

      setGeneratedImages(data.urls);
      setSelectedGeneratedImage(data.urls[0]);

      toast({
        title: "Success",
        description: "Images generated successfully! Please select your preferred variation.",
      });
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate images');
      toast({
        title: "Error",
        description: "Failed to generate images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setGenerationLoading(false);
      setLoadingProgress(100);
      setModelDialogOpen(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedGeneratedImage || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(selectedGeneratedImage);
      toast({
        title: "Success",
        description: "Image saved successfully",
      });
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      setError(error instanceof Error ? error.message : "Failed to save image");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save image",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = () => {
    setGeneratedImages([]);
    setSelectedGeneratedImage(null);
    loadImage().catch(err => {
      console.error("Failed to reset after rejection:", err);
      setError(err instanceof Error ? err.message : "Failed to reset canvas");
    });
  };

  React.useEffect(() => {
    if (!open) return;

    console.log("Dialog opened, initializing canvas");
    initCanvas();

    const timer = setTimeout(() => {
      loadImage().catch(err => {
        console.error("Failed to load image:", err);
        setError(err instanceof Error ? err.message : "Failed to load image");
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [open, initCanvas, loadImage]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
          <DialogDescription>
            Erase parts of the image and generate new content using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              onClick={handleResetEraser}
              className="gap-2"
              disabled={isLoading}
            >
              <Eraser className="h-4 w-4" />
              Reset Eraser
            </Button>
            <div className="flex-1">
              <Input
                placeholder="Enter prompt for the erased areas..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleGenerateClick}
              disabled={isLoading || !prompt}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>

          {/* Model Selection Dialog */}
          <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Select AI Model</DialogTitle>
                <DialogDescription>
                  Choose which AI model to use for image generation
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Select
                  value={selectedModel}
                  onValueChange={(value) => setSelectedModel(value as "dall-e" | "flux" | "imagen3")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dall-e">DALL-E</SelectItem>
                    <SelectItem value="flux">Flux</SelectItem>
                    <SelectItem value="imagen3">Imagen 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleModelSelect}>Generate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {selectedGeneratedImage ? "Original Image" : "Original (Erase Areas)"}
              </h3>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full max-w-[1024px] h-auto border rounded cursor-crosshair"
                  style={{
                    touchAction: "none",
                    aspectRatio: "1 / 1",
                    objectFit: "contain"
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                />
              </div>
            </div>

            {generatedImages.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Generated Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((url, idx) => (
                    <div
                      key={idx}
                      className={`relative cursor-pointer group ${
                        selectedGeneratedImage === url ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedGeneratedImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Variation ${idx + 1}`}
                        className="w-full h-full object-contain rounded border aspect-square transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded">
                        Click to select
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        Variation {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isSaving}
                  >
                    Reject All
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={!selectedGeneratedImage || isSaving}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Accept Selected"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}