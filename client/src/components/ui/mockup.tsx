"use client";

import { cn } from "@/lib/utils";

interface MockupFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "small" | "medium" | "large";
}

export function MockupFrame({ className, size = "medium", ...props }: MockupFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[1248px] rounded-lg border bg-background p-4 shadow-xl shadow-black/5",
        size === "small" && "max-w-3xl",
        size === "large" && "max-w-7xl",
        className
      )}
      {...props}
    />
  );
}

export function Mockup({ type, ...props }: { type: "responsive" } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background",
        type === "responsive" && "aspect-[1440/900]"
      )}
      {...props}
    />
  );
}
