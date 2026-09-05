/** @jsxImportSource react */

import { useNavigate } from "@tanstack/react-router";
import { Fragment, type RefObject, useEffect, useState } from "react";

import {
	Command,
	CommandCollection,
	CommandDialog,
	CommandDialogPopup,
	CommandDialogPrimitive,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
	CommandSeparator,
} from "@/components/ui/command";
import { useSearch } from "@/lib/queries";

type NavItem = {
	kind: "nav";
	value: string;
	label: string;
	to: "/" | "/leaderboards" | "/health" | "/categories" | "/charts" | "/badges";
};
type PluginItem = { kind: "plugin"; value: string; label: string; id: string };
type AuthorItem = { kind: "author"; value: string; label: string; count: number };
type PaletteItem = NavItem | PluginItem | AuthorItem;
type Group = { value: string; items: PaletteItem[] };

const NAV_ITEMS: NavItem[] = [
	{ kind: "nav", value: "overview", label: "Overview", to: "/" },
	{ kind: "nav", value: "leaderboards", label: "Leaderboards", to: "/leaderboards" },
	{ kind: "nav", value: "health", label: "Ecosystem Health", to: "/health" },
	{ kind: "nav", value: "categories", label: "Categories", to: "/categories" },
	{ kind: "nav", value: "charts", label: "Charts", to: "/charts" },
	{ kind: "nav", value: "badges", label: "Badges", to: "/badges" },
];

type CommandPaletteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	finalFocus: RefObject<HTMLElement | null>;
};

/** Ctrl+K command palette: navigate pages, search plugins and authors via /api/search. */
export default function CommandPaletteDialog({ open, onOpenChange, finalFocus }: CommandPaletteDialogProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [debounced, setDebounced] = useState("");

	useEffect(() => {
		const timeout = setTimeout(() => setDebounced(query.trim()), 150);
		return () => clearTimeout(timeout);
	}, [query]);

	// One ranked server search; mode="none" below disables client-side
	// filtering so server matches (e.g. on author or description) survive.
	const search = useSearch(debounced, 8, open);
	const pluginItems: PluginItem[] = (search.data?.plugins ?? []).map((plugin) => ({
		kind: "plugin",
		value: plugin.id,
		label: plugin.name ?? plugin.id,
		id: plugin.id,
	}));
	const authorItems: AuthorItem[] = (search.data?.authors ?? [])
		.filter((author) => author.author != null)
		.map((author) => ({
			kind: "author",
			value: author.author!,
			label: author.author!,
			count: author.plugins,
		}));
	const needle = debounced.toLowerCase();
	const groups: Group[] = [
		{
			value: "Navigation",
			items: NAV_ITEMS.filter((item) => !needle || item.label.toLowerCase().includes(needle)),
		},
		{ value: "Plugins", items: pluginItems },
		{ value: "Authors", items: authorItems },
	].filter((group) => group.items.length > 0);

	const go = (item: PaletteItem) => {
		onOpenChange(false);
		if (item.kind === "nav") navigate({ to: item.to });
		else if (item.kind === "plugin") navigate({ to: "/plugins/$pluginId", params: { pluginId: item.id } });
		else navigate({ to: "/authors/$authorId", params: { authorId: item.value } });
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandDialogPopup finalFocus={finalFocus}>
				<CommandDialogPrimitive.Title className="sr-only">Search pages or plugins</CommandDialogPrimitive.Title>
				<Command items={groups} mode="none" onValueChange={setQuery}>
					<CommandInput placeholder="Search pages or plugins…" />
					<CommandPanel>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandList>
							{(group: Group, _index: number) => (
								<Fragment key={group.value}>
									<CommandGroup items={group.items}>
										<CommandGroupLabel>{group.value}</CommandGroupLabel>
										<CommandCollection>
											{(item: PaletteItem) => (
												<CommandItem
													key={item.value}
													value={item.value}
													onClick={() => go(item)}
												>
													<span className="min-w-0 flex-1 truncate">{item.label}</span>
													{item.kind === "plugin" && (
														<span className="max-w-[45%] truncate font-mono text-muted-foreground text-xs">
															{item.id}
														</span>
													)}
													{item.kind === "author" && (
														<span className="font-mono text-muted-foreground text-xs">
															{item.count} plugin{item.count === 1 ? "" : "s"}
														</span>
													)}
												</CommandItem>
											)}
										</CommandCollection>
									</CommandGroup>
									<CommandSeparator />
								</Fragment>
							)}
						</CommandList>
					</CommandPanel>
				</Command>
			</CommandDialogPopup>
		</CommandDialog>
	);
}
