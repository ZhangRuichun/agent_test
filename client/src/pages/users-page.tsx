import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreVertical, Plus, Mail, Ban, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SelectUser } from "@db/schema";

interface AddUserFormData {
  email: string;
  firstName: string;
  lastName: string;
}

interface InviteLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inviteLink: string;
}

function InviteLinkDialog({ isOpen, onOpenChange, inviteLink }: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitation Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="flex-1 text-sm break-all">{inviteLink}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this link with the user to complete their account setup.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<SelectUser[]>({
    queryKey: ["/api/users"],
  });

  const handleAddUser = async (data: AddUserFormData) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setInviteLink(`${window.location.origin}/set-password/${result.passwordResetToken}`);
      setIsAddUserOpen(false);
      setIsInviteLinkOpen(true);
      toast({
        title: "Success",
        description: "User created successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleSuspendUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/suspend`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "User has been suspended",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleGetInviteLink = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/invite`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { passwordResetToken } = await response.json();
      setInviteLink(`${window.location.origin}/set-password/${passwordResetToken}`);
      setIsInviteLinkOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddUser({
                  email: formData.get("email") as string,
                  firstName: formData.get("firstName") as string,
                  lastName: formData.get("lastName") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" required placeholder="Doe" />
              </div>
              <Button type="submit" className="w-full">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.status}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleGetInviteLink(user.id)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSuspendUser(user.id)}
                      className="text-red-600"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InviteLinkDialog
        isOpen={isInviteLinkOpen}
        onOpenChange={setIsInviteLinkOpen}
        inviteLink={inviteLink}
      />
    </div>
  );
}