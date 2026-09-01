/** @jsxImportSource react */
/**
 * Build-time brand assets, rendered with takumi (no headless browser, no
 * runtime cost — the Worker never sees this code). Run via `bun run assets`;
 * `bun run build` runs it first. Writes public/og.png and public/favicon.ico.
 */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { render } from "takumi-js";

const FONT_DIR = (pkg: string, file: string) => join(import.meta.dirname, "..", "node_modules", pkg, "files", file);

const FONTS = [
	{
		name: "Geist Mono",
		data: await readFile(FONT_DIR("@fontsource-variable/geist-mono", "geist-mono-latin-wght-normal.woff2")),
	},
];

const SITE_BACKGROUND = "#0b0f14";
const SITE_FOREGROUND = "#f4f4f5";

// sRGB conversion of the light-mode --graph-accent: oklch(0.5 0.18 255).
const GRAPH_ACCENT = { red: 0, green: 95, blue: 198 } as const;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const FRAME_COLUMNS = 72;
const FRAME_INNER_COLUMNS = FRAME_COLUMNS - 2;
const OG_TOP = `+${"-".repeat(29)} [ OMACHI ] ${"-".repeat(29)}+`;

function frameRow(content = "") {
	return `|${content.padEnd(FRAME_INNER_COLUMNS).slice(0, FRAME_INNER_COLUMNS)}|`;
}

const OG_ROWS: readonly { id: string; text: string; accent?: boolean }[] = [
	{ id: "top", text: OG_TOP, accent: true },
	{ id: "space-1", text: frameRow() },
	{ id: "tagline", text: frameRow("  tagline    analytics for the Omarchy plugin catalog") },
	{ id: "space-2", text: frameRow() },
	{ id: "metrics", text: frameRow("  metrics    hearts / views / copies / badges") },
	{ id: "refresh", text: frameRow("  refresh    every 6 hours") },
	{ id: "space-3", text: frameRow() },
	{ id: "status", text: frameRow("  status     independent companion dashboard") },
	{ id: "site", text: frameRow("  site       stats.ussego.com") },
	{ id: "source", text: frameRow("  source     github.com/ussego/omastats") },
	{ id: "space-4", text: frameRow() },
	{ id: "bottom", text: `+${"-".repeat(FRAME_INNER_COLUMNS)}+` },
];

function OgCard() {
	return (
		<div
			style={{
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: SITE_BACKGROUND,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					fontFamily: "Geist Mono",
					fontSize: 24,
					fontWeight: 500,
					lineHeight: 1.55,
					whiteSpace: "pre",
					color: SITE_FOREGROUND,
				}}
			>
				{OG_ROWS.map((row) => (
					<div
						key={row.id}
						style={{
							color: row.accent
								? `rgb(${GRAPH_ACCENT.red}, ${GRAPH_ACCENT.green}, ${GRAPH_ACCENT.blue})`
								: undefined,
						}}
					>
						{row.text}
					</div>
				))}
			</div>
		</div>
	);
}

const ogPng = await render(<OgCard />, { width: OG_WIDTH, height: OG_HEIGHT, fonts: FONTS });
const publicDir = join(import.meta.dirname, "..", "public");
await writeFile(join(publicDir, "og.png"), ogPng);

const pngSignature = ogPng[0] === 0x89 && ogPng[1] === 0x50 && ogPng[2] === 0x4e && ogPng[3] === 0x47;
if (!pngSignature || ogPng.length < 1000) throw new Error(`og.png looks wrong: ${ogPng.length} bytes`);
console.log(`og.png: ${(ogPng.length / 1024).toFixed(1)} KiB`);

// ------------------------------------------------------------------ favicon

/** Decode the takumi-rendered glyph so its antialiasing can be reused as an alpha mask. */
function decodePng(bytes: Uint8Array): { width: number; height: number; rgba: Uint8Array } {
	const png = PNG.sync.read(Buffer.from(bytes));
	return {
		width: png.width,
		height: png.height,
		rgba: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength),
	};
}

const FAVICON_SIZES = [16, 32, 48] as const;

/** Rasterize a bold Geist Mono "o", crop it to its visual bounds, and return its alpha mask. */
async function glyphMask(size: number): Promise<Uint8Array> {
	const canvas = size * 2;
	const rendered = await render(
		<div
			style={{
				width: canvas,
				height: canvas,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					fontFamily: "Geist Mono",
					fontSize: Math.round(canvas * 0.62),
					fontWeight: 700,
					color: "white",
				}}
			>
				o
			</div>
		</div>,
		{ width: canvas, height: canvas, fonts: FONTS },
	);
	const { rgba } = decodePng(rendered);

	let minX = canvas;
	let minY = canvas;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < canvas; y++) {
		for (let x = 0; x < canvas; x++) {
			if (rgba[(y * canvas + x) * 4 + 3] > 8) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}
	if (maxX < minX || maxY < minY) throw new Error(`favicon glyph did not render at ${size}px`);

	const offX = Math.min(Math.max(Math.round((minX + maxX + 1 - size) / 2), 0), canvas - size);
	const offY = Math.min(Math.max(Math.round((minY + maxY + 1 - size) / 2), 0), canvas - size);
	const mask = new Uint8Array(size * size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			mask[y * size + x] = rgba[((y + offY) * canvas + (x + offX)) * 4 + 3];
		}
	}
	return mask;
}

/** Apply the one graph accent as a solid fill while preserving glyph antialiasing. */
function accentGlyph(mask: Uint8Array, size: number): Uint8Array {
	const png = new PNG({ width: size, height: size });
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			png.data[i] = GRAPH_ACCENT.red;
			png.data[i + 1] = GRAPH_ACCENT.green;
			png.data[i + 2] = GRAPH_ACCENT.blue;
			png.data[i + 3] = mask[y * size + x];
		}
	}
	return PNG.sync.write(png);
}

async function renderFaviconIcon(size: number): Promise<Uint8Array> {
	return accentGlyph(await glyphMask(size), size);
}

/** Pack PNG-compressed frames into a classic ICO container (16/32/48). */
function packIco(frames: { size: number; png: Uint8Array }[]): Uint8Array {
	const header = 6 + 16 * frames.length;
	const out = new Uint8Array(header + frames.reduce((total, frame) => total + frame.png.length, 0));
	out[2] = 1; // type: ICO
	out[4] = frames.length;
	let offset = header;
	frames.forEach((frame, index) => {
		const entry = 6 + index * 16;
		out[entry] = frame.size;
		out[entry + 1] = frame.size;
		out[entry + 4] = 1; // planes
		out[entry + 7] = 32; // bitcount (LE bytes 6-7)
		out[entry + 8] = frame.png.length & 0xff;
		out[entry + 9] = (frame.png.length >>> 8) & 0xff;
		out[entry + 10] = (frame.png.length >>> 16) & 0xff;
		out[entry + 11] = (frame.png.length >>> 24) & 0xff;
		out[entry + 12] = offset & 0xff;
		out[entry + 13] = (offset >>> 8) & 0xff;
		out[entry + 14] = (offset >>> 16) & 0xff;
		out[entry + 15] = (offset >>> 24) & 0xff;
		out.set(frame.png, offset);
		offset += frame.png.length;
	});
	return out;
}

const ico = packIco(
	await Promise.all(FAVICON_SIZES.map(async (size) => ({ size, png: await renderFaviconIcon(size) }))),
);
await writeFile(join(publicDir, "favicon.ico"), ico);
console.log(`favicon.ico: ${ico.length} bytes`);

const faviconPng = await renderFaviconIcon(64);
await writeFile(join(publicDir, "favicon.png"), faviconPng);
console.log(`favicon.png: ${faviconPng.length} bytes`);
