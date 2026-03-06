"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-sm font-semibold",
        score >= 70 && "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
        score >= 40 && score < 70 && "border-yellow-500/30 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
        score < 40 && "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
      )}
    >
      {score}/100
    </Badge>
  );
}
