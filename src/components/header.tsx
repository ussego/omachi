import { Link } from "@tanstack/react-router";
import { HeartIcon, MenuIcon } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetFooter,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
	{ to: "/leaderboards", label: "Leaderboards" },
	{ to: "/health", label: "Ecosystem Health" },
	{ to: "/categories", label: "Categories" },
	{ to: "/charts", label: "Charts" },
	{ to: "/badges", label: "Badges" },
] as const;

/** GitHub mark (simple-icons path). */
function GithubIcon({ className }: { className?: string }) {
	return (
		<svg
			fill="currentColor"
			fillRule="evenodd"
			height="1em"
			style={{ flex: "none", lineHeight: 1 }}
			viewBox="0 0 24 24"
			width="1em"
			className={className}
			aria-hidden="true"
		>
			<path d="M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z" />
		</svg>
	);
}

function MobileNav() {
	return (
		<Sheet>
			<SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="Menu" className="lg:hidden" />}>
				<MenuIcon className="size-4" />
			</SheetTrigger>
			<SheetPopup side="right" className="max-w-72">
				<SheetHeader>
					<SheetTitle className="text-lg">Menu</SheetTitle>
				</SheetHeader>
				<SheetPanel>
					<nav className="flex flex-col gap-3">
						{NAV.map((item) => (
							<SheetClose
								key={item.to}
								render={
									<Link
										to={item.to}
										className="flex items-center gap-2 font-medium text-2xl transition-colors hover:text-foreground"
										activeProps={{ className: "text-foreground" }}
										inactiveProps={{ className: "text-muted-foreground" }}
									/>
								}
							>
								{item.label}
							</SheetClose>
						))}
					</nav>
				</SheetPanel>
				<SheetFooter>
					<Button
						variant="ghost"
						size="sm"
						render={<a href="https://github.com/ussego/omastats" target="_blank" rel="noreferrer" />}
					>
						<GithubIcon className="size-4" />
						GitHub
					</Button>
					<Button
						variant="ghost"
						size="sm"
						render={<a href="https://github.com/sponsors/ussego" target="_blank" rel="noreferrer" />}
					>
						<HeartIcon className="size-4" />
						Sponsor
					</Button>
				</SheetFooter>
			</SheetPopup>
		</Sheet>
	);
}

export default function Header() {
	return (
		<header className="sticky top-0 z-40 shrink-0">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mx-4 flex h-14 items-center gap-4 rounded-b-none border border-t-0 bg-background/80 px-4 backdrop-blur sm:mx-6">
					<Link to="/" className="font-heading text-lg tracking-tight">
						Omachi
					</Link>
					{/* Keep nav links whitespace-nowrap and hide them below lg: Ecosystem Health only fits in the fixed-height bar at lg. */}
					<nav className="hidden flex-1 items-center gap-1 whitespace-nowrap text-sm lg:flex">
						{NAV.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								activeProps={{ className: "font-medium text-foreground" }}
								inactiveProps={{ className: "text-muted-foreground" }}
								className="rounded-none px-2.5 py-1.5 transition-colors hover:text-foreground"
							>
								{item.label}
							</Link>
						))}
					</nav>
					<div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
						<ThemeToggle />
						<CommandPalette />
						<Button
							variant="outline"
							size="icon-sm"
							aria-label="GitHub repository"
							title="GitHub repository"
							className="hidden lg:inline-flex"
							render={<a href="https://github.com/ussego/omastats" target="_blank" rel="noreferrer" />}
						>
							<GithubIcon className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon-sm"
							aria-label="Sponsor on GitHub"
							title="Sponsor on GitHub"
							className="hidden lg:inline-flex"
							render={<a href="https://github.com/sponsors/ussego" target="_blank" rel="noreferrer" />}
						>
							<HeartIcon className="size-4" />
						</Button>
						<MobileNav />
					</div>
				</div>
			</div>
		</header>
	);
}
