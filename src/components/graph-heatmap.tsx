"use client";

import { motion, useReducedMotion } from "motion/react";
import * as React from "react";

import { Graph, GraphBody, type GraphTone } from "@/components/graph-frame/graph-frame";
import {
	fadeUp,
	GRAPH_TIP_CLASS,
	type Glyphs,
	type GraphPalette,
	graphTransition,
	intensityClass,
	intensityGlyph,
	intensityLevel,
	resolveGlyphs,
	toneClass,
} from "@/components/graph-frame/graph-motion";
import { cn } from "@/lib/utils";

type HeatRow = {
	label: string;
	values: number[];
};

type Cell = {
	row: number;
	col: number;
};

type GraphHeatmapProps = {
	title: string;
	columns: string[];
	rows: HeatRow[];
	max?: number;
	legend?: boolean;
	caption?: string;
	glyphs?: Glyphs;
	palette?: GraphPalette;
	tone?: GraphTone;
	corner?: string;
	className?: string;
};

function IntensityScale({
	glyphs,
	palette,
	tone,
}: {
	glyphs: readonly string[];
	palette?: GraphPalette;
	tone?: GraphTone;
}) {
	return (
		<p className="flex items-center gap-2 text-graph-muted">
			<span>Less</span>
			<span aria-hidden="true" className="flex select-none">
				{glyphs.map((glyph, index) => (
					<span
						className={cn(
							"w-[1ch] text-center",
							intensityClass(Math.round((index / Math.max(glyphs.length - 1, 1)) * 4), palette, tone),
						)}
						key={`${glyph}-${index}`}
					>
						{glyph}
					</span>
				))}
			</span>
			<span>More</span>
		</p>
	);
}

function GraphHeatmap({
	title,
	columns,
	rows,
	max,
	legend = true,
	caption,
	glyphs,
	palette,
	tone,
	corner,
	className,
}: GraphHeatmapProps) {
	const reduce = useReducedMotion();
	const item = fadeUp(reduce);
	const peak = max ?? Math.max(0, ...rows.flatMap((row) => row.values), 0);
	const template = `7rem repeat(${Math.max(columns.length, 1)}, minmax(1.25ch, 1fr))`;
	const glyphSet = resolveGlyphs(glyphs);
	const [active, setActive] = React.useState<Cell | null>(null);
	const lastRow = rows.length - 1;
	const lastCol = columns.length - 1;
	const activeCell =
		active != null && active.row >= 0 && active.row <= lastRow && active.col >= 0 && active.col <= lastCol
			? active
			: null;
	const activeValue = activeCell != null ? (rows[activeCell.row]?.values[activeCell.col] ?? 0) : 0;

	function onGridKeyDown(event: React.KeyboardEvent) {
		const row = activeCell?.row ?? 0;
		const col = activeCell?.col ?? 0;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			setActive({ row, col: Math.min(lastCol, col + 1) });
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			setActive({ row, col: Math.max(0, col - 1) });
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive({ row: Math.min(lastRow, row + 1), col });
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive({ row: Math.max(0, row - 1), col });
		} else if (event.key === "Home") {
			event.preventDefault();
			setActive({ row, col: 0 });
		} else if (event.key === "End") {
			event.preventDefault();
			setActive({ row, col: lastCol });
		} else if (event.key === "Escape") {
			setActive(null);
		}
	}

	return (
		<Graph title={title} tone={tone} className={className} corner={corner}>
			<GraphBody className="flex flex-col gap-4">
				<div
					role="img"
					aria-label={
						activeCell != null
							? `${rows[activeCell.row]?.label} ${columns[activeCell.col] ?? ""} ${activeValue}`
							: `${title} heatmap, ${rows.length} rows`
					}
					tabIndex={0}
					onMouseLeave={() => setActive(null)}
					onBlur={() => setActive(null)}
					onFocus={() =>
						setActive((prev) => prev ?? (lastRow >= 0 && lastCol >= 0 ? { row: 0, col: 0 } : null))
					}
					onKeyDown={onGridKeyDown}
					className="flex w-full flex-col gap-2 outline-none focus-visible:ring-1 focus-visible:ring-graph-accent"
				>
					<div className="grid w-full items-end gap-x-1" style={{ gridTemplateColumns: template }}>
						<span />
						{columns.map((column) => (
							<span className="truncate text-center text-graph-muted" key={column}>
								{column}
							</span>
						))}
					</div>
					<ul className="flex flex-col gap-1" role="list">
						{rows.map((row, rowIndex) => (
							<motion.li
								aria-label={`${row.label}: ${columns
									.map((column, index) => `${column} ${row.values[index] ?? 0}`)
									.join(", ")}`}
								animate="show"
								className="grid items-center gap-x-1"
								initial={reduce ? false : "hidden"}
								key={row.label}
								style={{ gridTemplateColumns: template }}
								transition={graphTransition(reduce, { delay: Math.min(rowIndex * 0.04, 0.8) })}
								variants={item}
							>
								<span className="truncate text-foreground">{row.label}</span>
								{columns.map((column, colIndex) => {
									const value = row.values[colIndex] ?? 0;
									const level = intensityLevel(value, peak);
									const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;

									return (
										<span
											aria-hidden="true"
											onMouseEnter={() => setActive({ row: rowIndex, col: colIndex })}
											className={cn(
												"text-center leading-none select-none",
												isActive && "relative",
												intensityClass(level, palette, tone),
											)}
											key={`${row.label}-${column}`}
										>
											{intensityGlyph(level, glyphSet)}
											{isActive ? (
												<span
													aria-hidden="true"
													className={cn(GRAPH_TIP_CLASS, "bottom-full mb-2")}
													style={{ left: "50%", transform: "translateX(-50%)" }}
												>
													<span className="text-graph-muted">
														{row.label} {column}{" "}
													</span>
													<span className={toneClass(palette, "primary", tone)}>
														{value.toLocaleString("en-US")}
													</span>
												</span>
											) : null}
										</span>
									);
								})}
							</motion.li>
						))}
					</ul>
				</div>
				{legend || caption ? (
					<div className="flex flex-wrap items-center justify-between gap-3">
						{caption ? <p className="text-graph-muted">{caption}</p> : <span />}
						{legend ? <IntensityScale glyphs={glyphSet} palette={palette} tone={tone} /> : null}
					</div>
				) : null}
			</GraphBody>
		</Graph>
	);
}

export type { GraphHeatmapProps, HeatRow };
export { GraphHeatmap };
