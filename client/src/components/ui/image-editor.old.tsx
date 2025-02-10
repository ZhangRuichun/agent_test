import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eraser, Loader2 } from "lucide-react";

interface ImageEditorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

export function ImageEditor({ imageUrl, open, onClose, onSave }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // First useEffect to handle canvas initialization
  useEffect(() => {
    console.log('Canvas initialization check:', {
      hasCanvasRef: !!canvasRef.current,
      isDialogOpen: open
    });

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        console.log('Canvas context initialized successfully');
        setIsCanvasReady(true);
      } else {
        console.error('Failed to get canvas context');
        setError('Failed to initialize canvas context');
      }
    }
  }, [open]); // Re-run when dialog opens

  // Second useEffect to handle image loading
  useEffect(() => {
    console.log('Image loading effect triggered:', { 
      open, 
      imageUrl, 
      isCanvasReady,
      hasCanvas: !!canvasRef.current 
    });

    if (!open || !imageUrl || !isCanvasReady || !canvasRef.current) {
      console.log('Image loading prerequisites not met:', { 
        open, 
        hasImageUrl: !!imageUrl, 
        isCanvasReady,
        hasCanvas: !!canvasRef.current 
      });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Failed to get canvas context');
      setError('Failed to initialize canvas context');
      return;
    }

    console.log('Starting image load process...');
    setIsImageLoading(true);
    setError(null);

    // Handle both relative and absolute URLs
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    console.log('Attempting to load image from:', fullImageUrl);

    // Create a new image element
    const img = new Image();
    console.log('Created new Image object');

    img.crossOrigin = "anonymous"; // Enable CORS
    console.log('Set crossOrigin to anonymous');

    img.onload = () => {
      console.log('Image.onload triggered:', {
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        src: img.src
      });

      // Calculate dimensions while maintaining aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      console.log('Calculated dimensions:', { width, height });

      // Set canvas dimensions and draw
      canvas.width = width;
      canvas.height = height;
      console.log('Set canvas dimensions:', { canvasWidth: canvas.width, canvasHeight: canvas.height });

      // Clear canvas before drawing
      ctx.clearRect(0, 0, width, height);
      console.log('Cleared canvas');

      try {
        console.log('Starting to draw image to canvas');
        ctx.drawImage(img, 0, 0, width, height);
        console.log('Successfully drew image to canvas');
        setIsImageLoading(false);
      } catch (err) {
        console.error('Error drawing image to canvas:', err);
        setError('Failed to draw image to canvas');
        setIsImageLoading(false);
      }
    };

    img.onerror = (err) => {
      console.error('Image.onerror triggered:', err);
      setError('Failed to load image. Please check the image URL and try again.');
      setIsImageLoading(false);
    };

    // Load the image
    console.log('Setting image.src to start loading:', fullImageUrl);
    img.src = fullImageUrl;

    return () => {
      console.log('Cleanup: removing image event listeners');
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, open, isCanvasReady]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isErasing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20 * scaleX, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isErasing || e.buttons !== 1) return;
    handleMouseDown(e);
  };

  const handleGenerateImage = async () => {
    if (!prompt || !canvasRef.current) return;

    setIsLoading(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;

      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return;

      // Create mask from erased areas
      maskCtx.drawImage(canvas, 0, 0);
      maskCtx.globalCompositeOperation = "difference";

      const originalImage = new Image();
      await new Promise((resolve, reject) => {
        originalImage.onload = resolve;
        originalImage.onerror = reject;
        originalImage.src = imageUrl;
      });
      maskCtx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

      // Convert canvases to base64
      const imageData = canvas.toDataURL("image/png").split(",")[1];
      const maskData = maskCanvas.toDataURL("image/png").split(",")[1];

      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          mask: maskData,
          prompt,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setGeneratedImage(result.url);
    } catch (error) {
      console.error("Error generating image:", error);
      setError(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (generatedImage) {
      onSave(generatedImage);
      onClose();
    }
  };

  const handleReject = () => {
    setGeneratedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setIsCanvasReady(false);
        setIsImageLoading(true);
        setError(null);
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex gap-4 items-center">
            <Button
              variant={isErasing ? "default" : "outline"}
              onClick={() => setIsErasing(!isErasing)}
              className="gap-2"
            >
              <Eraser className="h-4 w-4" />
              Eraser {isErasing ? "(Active)" : ""}
            </Button>
            <div className="flex-1">
              <Input
                placeholder="Enter prompt for the erased areas..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerateImage} disabled={isLoading || isImageLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Original (Erase Areas)</h3>
              {isImageLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  className="w-full h-auto border rounded cursor-crosshair"
                  style={{
                    touchAction: "none",
                    maxHeight: "400px",
                    objectFit: "contain"
                  }}
                />
              )}
            </div>

            {generatedImage && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Generated Result</h3>
                <img
                  src={generatedImage.startsWith('http')
                    ? generatedImage
                    : `${window.location.origin}${generatedImage}`}
                  alt="Generated result"
                  className="w-full h-auto border rounded"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                />
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAccept}>Accept</Button>
                  <Button variant="outline" onClick={handleReject}>
                    Reject
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