
import { useEffect } from "react";
import { Home, MessageSquare } from "lucide-react";
import { useNav } from "@/components/layout/layout";

export default function ChatPage() {
  const { setNavigation } = useNav();

  useEffect(() => {
    setNavigation([
      { name: 'Home', href: '/', icon: Home },
      { name: 'New Chat', href: '/chat/new', icon: MessageSquare },
      { name: 'Conversation 1', href: '/chat/1', icon: MessageSquare },
      { name: 'Conversation 2', href: '/chat/2', icon: MessageSquare },
    ]);
  }, [setNavigation]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chat</h1>
      <p className="text-muted-foreground">
        This is a placeholder for the chat feature 2.
      </p>
    </div>
  );
}
