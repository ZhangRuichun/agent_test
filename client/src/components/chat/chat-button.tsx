import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ChatButton() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
            <MessageSquare className="h-6 w-6" />
            <span className="sr-only">Open Chat</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="fixed bottom-[80px] right-4 w-[400px] h-[500px] mb-4 p-0 shadow-2xl" 
          style={{ 
            position: 'fixed',
            transform: 'translate(0, 0)',
            top: 'auto',
            left: 'auto'
          }}>
          <DialogHeader className="border-b px-4 py-2">
            <DialogTitle>AI Assistant</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {/* Chat content will go here */}
            <p className="text-muted-foreground">Chat functionality coming soon...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}