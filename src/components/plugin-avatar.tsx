import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
	"oklch(0.5 0.18 25)",
	"oklch(0.5 0.18 70)",
	"oklch(0.5 0.18 135)",
	"oklch(0.5 0.18 195)",
	"oklch(0.5 0.18 255)",
	"oklch(0.5 0.18 310)",
] as const;

function hashName(name: string): number {
	let hash = 2166136261;
	for (const character of name) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function initials(name: string): string {
	const words = name
		.trim()
		.split(/[\s._-]+/u)
		.filter(Boolean);
	if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0]}`.toUpperCase();
	return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

export function PluginAvatar({ name, className }: { name: string; className?: string }) {
	const hash = hashName(name);
	return (
		<span
			aria-label={`${name} avatar`}
			className={cn(
				"inline-flex items-center justify-center border border-border font-mono text-[0.625rem] text-white uppercase",
				className,
			)}
			role="img"
			style={{ backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
		>
			{initials(name)}
		</span>
	);
}
