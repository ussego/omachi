/** @jsxImportSource react */
import { useChartPart } from "./chart-context";

export function XAxis({
	dataKey,
	tickFormatter,
	tickMargin = 8,
	maxTicks = 8,
	angle = 0,
}: {
	dataKey?: string;
	tickFormatter?: (value: unknown, index: number) => string;
	tickMargin?: number;
	maxTicks?: number;
	/** Rotate tick labels around their anchor point (negative = counter-clockwise). */
	angle?: number;
}) {
	const ctx = useChartPart("XAxis");
	if (!ctx.ready) return null;

	const step = Math.max(1, Math.ceil(ctx.dataLength / maxTicks));
	const y = ctx.plot.height + tickMargin;
	const rotated = angle !== 0;
	// Edge labels anchor inward so they never overflow the plot into the page
	// margins (first tick points right, last points left, middles centered).
	const lastShown = ctx.dataLength - 1 - ((ctx.dataLength - 1) % step);

	return (
		<g className="fill-current font-mono text-[10px] text-muted-foreground">
			{ctx.data.map((row, i) => {
				if (i % step !== 0) return null;
				const raw = dataKey ? row[dataKey] : i;
				const label = tickFormatter ? tickFormatter(raw, i) : String(raw ?? "");
				const x = ctx.xCenter(i) ?? 0;
				const textAnchor = rotated ? "end" : i === 0 ? "start" : i === lastShown ? "end" : "middle";
				return (
					<text
						// biome-ignore lint/suspicious/noArrayIndexKey: index is the stable x position
						key={i}
						x={x}
						y={y}
						textAnchor={textAnchor}
						dominantBaseline={rotated ? "middle" : "hanging"}
						transform={rotated ? `rotate(${angle} ${x} ${y})` : undefined}
						fill="currentColor"
					>
						{label}
					</text>
				);
			})}
		</g>
	);
}
