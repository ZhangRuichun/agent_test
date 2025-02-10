import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Users, Layers, Package, Brain, User, PlayCircle, BarChart2, LucideIcon, Binary } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNav } from "./layout";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const defaultNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/home', icon: Home },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Personas', href: '/personas', icon: Brain },
  { name: 'Questions', href: '/questions', icon: User },
  { name: 'Digital Shelves', href: '/shelf-setup', icon: Layers },
  { name: 'Run Survey', href: '/run-survey', icon: PlayCircle },
  { name: 'Analysis', href: '/analysis', icon: BarChart2 },
  { name: 'Simulation', href: '/simulation', icon: Binary },
  { name: 'User Management', href: '/users', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { navigation } = useNav();

  return (
    <aside
      className={cn(
        "border-r bg-sidebar overflow-hidden transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <nav className="flex flex-col gap-2 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant={location === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                !isOpen && "justify-center"
              )}
              onClick={() => navigate(item.href)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "opacity-100 w-auto" : "w-0 opacity-0"
              )}>
                {item.name}
              </span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}