/** @jsxImportSource react */
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Icon button that copies `text` and flashes a check for 1.5s. */
export function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1500);
		return () => clearTimeout(t);
	}, [copied]);
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			title={copied ? "Copied" : "Copy URL"}
			onClick={() => {
				navigator.clipboard.writeText(text);
				setCopied(true);
			}}
		>
			{copied ? <IconCheck className="text-green-600" /> : <IconCopy />}
		</Button>
	);
}

export function Code({ children }: { children: string }) {
	return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export function Snippet({ children }: { children: string }) {
	return <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm">{children}</pre>;
}
