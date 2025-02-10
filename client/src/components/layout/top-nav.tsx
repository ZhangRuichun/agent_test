import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "./profile-menu";
import { ThemeToggle } from "./theme-toggle";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="ml-4 flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold">Optishelf</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}