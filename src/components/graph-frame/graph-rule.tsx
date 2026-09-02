"use client";

import { cn } from "@/lib/utils";

/**
 * Section separator: a soft dashed horizontal rule spanning the full page
 * frame so it connects with the dashed sides. The negative margins bleed it
 * over the shell's content padding (`px-4 sm:px-6` in `src/routes/__root.tsx`).
 */
export function GraphRule({ className }: { className?: string }) {
	return <div aria-hidden="true" className={cn("graph-rule-soft my-2 -mx-4 sm:-mx-6", className)} />;
}
