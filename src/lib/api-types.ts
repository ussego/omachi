// Wire contract shared by the Worker API (src/lib/api.ts) and the client
// (src/lib/queries.ts). Pure types, no hono/drizzle imports, so the client
// bundle never pulls server dependencies. api.ts annotates its responses with
// `satisfies XResponse` so tsc fails if a handler drifts from the contract.

export type LatestSnapshot = {
	pluginId: string;
	snapshotAt: string;
	views: number | null;
	copies: number | null;
	hearts: number | null;
	verificationStatus: string | null;
	version: string | null;
	repositoryUpdatedAt: string | null;
	upstreamCheckStatus: string | null;
};

export type PluginSummary = {
	id: string;
	name: string | null;
	description: string | null;
	author: string | null;
	category: string | null;
	kind: string | null;
	license: string | null;
	tags: string[] | null;
	addedAt: string | null;
	repo: string | null;
	stars: number | null;
	installAvailable: boolean | null;
	status: string | null;
	sourceType: string | null;
	latest: LatestSnapshot | null;
};

export type PluginListResponse = {
	total: number;
	page: number;
	pageSize: number;
	plugins: PluginSummary[];
};

export type Snapshot = {
	id: number;
	pluginId: string;
	snapshotAt: string;
	views: number | null;
	copies: number | null;
	hearts: number | null;
	verificationStatus: string | null;
	version: string | null;
	repositoryUpdatedAt: string | null;
	upstreamCheckStatus: string | null;
};

export type PluginDetailResponse = {
	plugin: Omit<PluginSummary, "latest">;
	snapshots: Snapshot[];
	averages: { views: number | null; copies: number | null; hearts: number | null };
};

export type StatsPoint = { bucket: string; count: number };
export type StatsResponse = {
	groupBy: string;
	from: string | null;
	to: string | null;
	points: StatsPoint[];
};

export type LeaderboardRow = {
	pluginId: string;
	name: string | null;
	author: string | null;
	category: string | null;
	views: number | null;
	copies: number | null;
	hearts: number | null;
	score: number | null;
	spark?: { snapshotAt: string; views: number | null; copies: number | null; hearts: number | null }[];
};
export type LeaderboardResponse = { metric: string; rows: LeaderboardRow[] };

export type TrendingResponse = {
	days: number;
	top: {
		pluginId: string;
		name: string | null;
		author: string | null;
		views: number;
		copies: number;
		hearts: number;
	}[];
};

export type AuthorsResponse = {
	rows: {
		author: string | null;
		plugins: number;
		views: number | null;
		copies: number | null;
		hearts: number | null;
	}[];
};

export type AuthorDetailResponse = {
	author: string;
	totals: { plugins: number; views: number; copies: number; hearts: number };
	plugins: {
		id: string;
		name: string | null;
		category: string | null;
		kind: string | null;
		status: string | null;
		repo: string | null;
		views: number | null;
		copies: number | null;
		hearts: number | null;
	}[];
};

export type BreakdownRow = { status: string | null; count: number };
export type BreakdownResponse = {
	verification: BreakdownRow[];
	installStatus: BreakdownRow[];
	totalPlugins: number;
	verifiedCount: number;
};

export type CategoriesResponse = {
	rows: {
		category: string | null;
		count: number;
		avgHearts: number | null;
		avgViews: number | null;
		avgCopies: number | null;
	}[];
};

export type HeatmapResponse = {
	points: { category: string | null; month: string; count: number }[];
};

export type HealthResponse = {
	lastSnapshotAt: string | null;
	pluginCount: number;
	snapshotCount: number;
};

export type BrokenResponse = {
	staleDays: number;
	plugins: {
		pluginId: string;
		name: string | null;
		author: string | null;
		upstreamCheckStatus: string | null;
		repositoryUpdatedAt: string | null;
	}[];
};

export type BadgeResponse = {
	schemaVersion: number;
	label: string;
	message: string;
	color: string;
};

/** Chart-data response: JSON series consumed by shieldcn's /chart/json.svg. */
export type ChartSeriesResponse = {
	title: string;
	subtitle?: string;
	link?: string;
	total: number;
	points: { date: string; count: number }[];
};
