"use client";

import { cn } from "@/lib/utils";

interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "top" | "bottom";
}

export function Glow({ className, variant = "top", ...props }: GlowProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-0",
        variant === "top" ? "-top-72" : "-bottom-72",
        "transform-gpu overflow-hidden blur-3xl",
        className
      )}
      {...props}
    >
      <div
        className="relative aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-primary/50 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
        style={{
          clipPath:
            "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
        }}
      />
    </div>
  );
}
