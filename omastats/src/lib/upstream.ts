import { z } from "zod";

// Both upstream endpoints are third-party and can change without notice:
// validate the whole payload before anything is written to D1.

export const catalogPluginSchema = z.object({
	id: z.string(),
	name: z.string().nullish(),
	description: z.string().nullish(),
	author: z.string().nullish(),
	category: z.string().nullish(),
	kind: z.string().nullish(),
	license: z.string().nullish(),
	tags: z.array(z.string()).nullish(),
	addedAt: z.string().nullish(), // YYYY-MM-DD, immutable publish date
	repo: z.string().nullish(),
	stars: z.number().int().nullish(),
	installAvailable: z.boolean().nullish(),
	status: z.string().nullish(),
	sourceType: z.string().nullish(),
	version: z.string().nullish(),
	repositoryUpdatedAt: z.string().nullish(),
	upstreamCheckStatus: z.string().nullish(),
	verificationStatus: z.string().nullish(),
});

export const catalogSchema = z.object({
	generatedAt: z.string().nullish(),
	plugins: z.array(catalogPluginSchema),
});

export const statsSchema = z.object({
	schemaVersion: z.number().nullish(),
	plugins: z.record(
		z.string(),
		z.object({
			views: z.number().int().nullish(),
			copies: z.number().int().nullish(),
			hearts: z.number().int().nullish(),
		}),
	),
});
