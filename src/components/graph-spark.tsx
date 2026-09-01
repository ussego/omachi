"use client";

import { motion, useReducedMotion } from "motion/react";

import { Graph, GraphBody, GraphTick, GraphTrack } from "@/components/ui/graph-frame";
import {
	DIM_OPACITY,
	fillDelay,
	type Glyphs,
	type GraphPalette,
	graphTransition,
	isMonoPalette,
	resolveGlyphs,
	toneClass,
} from "@/lib/graph-motion";
import { cn } from "@/lib/utils";

const SPARK_DEFAULT = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

type GraphSparkProps = {
	title: string;
	data: number[];
	caption?: string;
	glyphs?: Glyphs;
	palette?: GraphPalette;
	corner?: string;
	className?: string;
};

function GraphSpark({ title, data, caption, glyphs, palette, corner, className }: GraphSparkProps) {
	const reduce = useReducedMotion();
	const max = Math.max(...data, 1);
	const last = data.length - 1;
	const set = glyphs == null ? SPARK_DEFAULT : resolveGlyphs(glyphs);
	const points = data.map((value, pointIndex) => {
		const glyphIndex = Math.round((value / max) * (set.length - 1));
		return { glyph: set[glyphIndex] ?? set[0] ?? "▁", key: `${pointIndex}-${value}` };
	});

	return (
		<Graph title={title} className={className} corner={corner}>
			<GraphBody className="flex flex-col items-center gap-4">
				<GraphTrack className="justify-center gap-0.5">
					{points.map((point, index) => {
						const live = index === last;

						return (
							<GraphTick className="flex-none" key={point.key}>
								<motion.span
									className={cn(
										live ? toneClass(palette, "primary") : toneClass(palette, "secondary"),
									)}
									initial={reduce ? false : { opacity: 0 }}
									transition={graphTransition(reduce, {
										delay: fillDelay(reduce, index),
									})}
									viewport={{ once: true }}
									whileInView={{
										opacity: live || !isMonoPalette(palette) ? 1 : DIM_OPACITY,
									}}
								>
									{point.glyph}
								</motion.span>
							</GraphTick>
						);
					})}
				</GraphTrack>
				{caption ? <p className="text-graph-muted">{caption}</p> : null}
				<span className="sr-only">
					Sparkline with {data.length} points
					{caption ? `. ${caption}` : ""}
				</span>
			</GraphBody>
		</Graph>
	);
}

export type { GraphSparkProps };
export { GraphSpark };
