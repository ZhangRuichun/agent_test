import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { HeroSection } from "@/components/ui/hero-section";
import { ArrowRight, LayoutGrid, Wand2 } from "lucide-react";

export default function HomePage() {
  return (
    <HeroSection
      badge={{
        text: "Now with AI-powered product generation",
        action: {
          text: "Learn more",
          href: "/products"
        }
      }}
      title="Digital Shelf Management Platform"
      description="Create, simulate, and optimize your product catalogs with cutting-edge AI technology."
      actions={[
        {
          text: "Get Started",
          href: "/shelf-setup",
          icon: <LayoutGrid className="h-5 w-5" />,
          variant: "default"
        },
        {
          text: "Try AI Generation",
          href: "/products",
          icon: <Wand2 className="h-5 w-5" />,
          variant: "default"
        }
      ]}
      image={{
        light: "/assets/dashboard-light.png",
        dark: "/assets/dashboard-dark.png",
        alt: "Digital Shelf Management Dashboard"
      }}
    />
  );
}