import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Theme {
  id: string;
  name: string;
  primary: string;
  variant: 'professional' | 'tint' | 'vibrant';
}

export function StyleDialog({ open, onOpenChange }: StyleDialogProps) {
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const { data: themes, isLoading: isLoadingThemes } = useQuery<Theme[]>({
    queryKey: ['/api/themes'],
  });

  const generateThemeMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await fetch('/api/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate theme');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Theme generated",
        description: "New theme has been created based on the website colors.",
      });
      setUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const response = await fetch('/api/themes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply theme');
      }
    },
    onSuccess: () => {
      toast({
        title: "Theme applied",
        description: "The selected theme has been applied successfully.",
      });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Style Customization</DialogTitle>
          <DialogDescription>
            Enter a website URL to generate a theme based on its color scheme or choose from existing themes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter website URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={generateThemeMutation.isPending}
            />
            <Button 
              onClick={() => generateThemeMutation.mutate(url)}
              disabled={!url || generateThemeMutation.isPending}
            >
              {generateThemeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate
            </Button>
          </div>

          <div className="grid gap-2">
            <h4 className="text-sm font-medium">Available Themes</h4>
            {isLoadingThemes ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-2">
                {themes?.map((theme) => (
                  <Card 
                    key={theme.id}
                    className="p-4 cursor-pointer hover:bg-accent"
                    onClick={() => applyThemeMutation.mutate(theme.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{theme.name}</span>
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.primary }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
