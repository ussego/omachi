/** @jsxImportSource react */
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { fmt } from "@/lib/format";

/** Summary stat tile: label + big mono figure + optional tooltip footnote. */
export function StatCard({
	label,
	value,
	footnote,
	loading,
}: {
	label: string;
	value: number | string | null;
	footnote?: string;
	loading?: boolean;
}) {
	const body = (
		<Card className="h-full">
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle className="font-mono text-2xl tabular-nums">
					{loading ? (
						<Skeleton className="h-8 w-20" />
					) : typeof value === "number" ? (
						fmt(value)
					) : (
						(value ?? "—")
					)}
				</CardTitle>
			</CardHeader>
		</Card>
	);
	if (!footnote) return body;
	return (
		<Tooltip>
			<TooltipTrigger render={<span className="h-full" />}>{body}</TooltipTrigger>
			<TooltipPopup>{footnote}</TooltipPopup>
		</Tooltip>
	);
}
