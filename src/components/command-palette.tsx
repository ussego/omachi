/** @jsxImportSource react */

import { IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandCollection,
	CommandDialog,
	CommandDialogPopup,
	CommandDialogTrigger,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
	CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

import { useAuthors, usePluginList } from "@/lib/queries";

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

/** Ctrl+K command palette: navigate pages, search plugins (server-side LIKE). */
export function CommandPalette() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debounced, setDebounced] = useState("");

	useEffect(() => {
		const t = setTimeout(() => setDebounced(query), 250);
		return () => clearTimeout(t);
	}, [query]);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const list = usePluginList(debounced, 1, 8);
	const authors = useAuthors(debounced.length > 0);
	const pluginItems: PluginItem[] = (list.data?.plugins ?? []).map((p) => ({
		kind: "plugin",
		// value is what the palette filters on (name + id so both match);
		// id stays the navigation target.
		value: `${p.name ?? p.id} ${p.id}`,
		label: p.name ?? p.id,
		id: p.id,
	}));
	const authorItems: AuthorItem[] = (authors.data?.rows ?? [])
		.filter((a) => a.author != null)
		.map((a) => ({ kind: "author", value: a.author!, label: a.author!, count: a.plugins }));
	const groups: Group[] = [
		{ value: "Navigation", items: NAV_ITEMS.map((i) => ({ ...i, value: `${i.to} ${i.label}` })) },
		{ value: "Plugins", items: pluginItems },
		...(debounced ? [{ value: "Authors", items: authorItems }] : []),
	];

	const go = (item: PaletteItem) => {
		setOpen(false);
		if (item.kind === "nav") navigate({ to: item.to });
		else if (item.kind === "plugin") navigate({ to: "/plugins/$pluginId", params: { pluginId: item.id } });
		else navigate({ to: "/authors/$authorId", params: { authorId: item.value } });
	};

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandDialogTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="graph-frame w-8 justify-center px-0 font-normal sm:w-44 sm:justify-between sm:px-[calc(--spacing(2.5)-1px)] 2xl:w-56"
					/>
				}
			>
				<span className="sr-only">Search pages or plugins</span>
				<IconSearch className="size-4" />
				<span className="hidden font-mono text-xs tracking-wide text-muted-foreground uppercase sm:inline">
					Search
				</span>
				<KbdGroup className="hidden sm:flex">
					<Kbd>Ctrl</Kbd>
					<Kbd>K</Kbd>
				</KbdGroup>
			</CommandDialogTrigger>
			<CommandDialogPopup>
				<Command items={groups} onValueChange={setQuery}>
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
