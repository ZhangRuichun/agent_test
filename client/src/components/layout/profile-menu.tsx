import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { LogOut, Palette } from "lucide-react";
import { useState } from "react";
import { StyleDialog } from "./style-dialog";

export function ProfileMenu() {
  const { user, logout } = useUser();
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const firstLetter = user?.username.charAt(0).toUpperCase() || '?';

  const handleLogout = async (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback>{firstLetter}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onClick={() => setStyleDialogOpen(true)}>
            <Palette className="h-4 w-4" />
            <span>Style</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StyleDialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
      />
    </>
  );
}