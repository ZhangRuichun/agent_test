"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1];

interface HeroContentProps {
  title: string;
  titleHighlight?: string;
  description: string;
}

function HeroContent({
  title,
  titleHighlight,
  description,
}: HeroContentProps) {
  return (
    <div className="flex flex-col">
      <motion.h1
        className="text-4xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
      >
        {title}{" "}
        {titleHighlight && (
          <span className="text-primary">{titleHighlight}</span>
        )}
      </motion.h1>
      <motion.p
        className="text-muted-foreground mt-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8, ease }}
      >
        {description}
      </motion.p>
    </div>
  );
}

interface HeroProps {
  content: HeroContentProps;
}

const Hero = ({ content }: HeroProps) => {
  return (
    <div className="pb-6">
      <HeroContent {...content} />
    </div>
  );
};

export { Hero };