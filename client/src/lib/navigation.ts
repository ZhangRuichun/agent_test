import { NavigationItem } from "@/components/layout/sidebar";
import { Home, Layers, Package, Users, Brain, PlayCircle, BarChart2, MessageSquare, FileQuestion } from "lucide-react";

export const productManagementNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/home', icon: Home },
  { name: 'Products', href: '/product-management', icon: Package },
  { name: 'Personas', href: '/synthetic-consumers', icon: Brain },
  { name: 'Questions', href: '/human-consumers', icon: FileQuestion },
  { name: 'Digital Shelves', href: '/shelf-setup', icon: Layers },
  { name: 'Run Survey', href: '/run-survey', icon: PlayCircle },
  { name: 'Analysis', href: '/analysis', icon: BarChart2 },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'User Management', href: '/users', icon: Users },
];