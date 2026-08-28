/** @jsxImportSource react */
/**
 * Build-time brand assets, rendered with takumi (no headless browser, no
 * runtime cost — the Worker never sees this code). Run via `bun run assets`;
 * `bun run build` runs it first. Writes public/og.png and public/favicon.ico.
 *
 * Both assets carry the site's dither-kit engine: `paintColumn` + palette
 * seeds imported from src/, rasterized into raw-RGBA `Bitmap`s (the OG bars
 * bake 2×2 cells so they read chunky; the favicon glyph uses 1px cells) and
 * bloomed with the same blur/brightness/screen recipe as `bloomLayerStyle`
 * (bloom="low"). Fonts mirror the site: Geist Pixel brand, Geist Variable
 * sans, JetBrains Mono labels.
 */
import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { join } from "node:path";
import { PNG } from "pngjs";
import { render } from "takumi-js";
import type { RgbaImage } from "takumi-js/helpers";
import { Bitmap } from "takumi-js/helpers/jsx";
import { paintColumn } from "../src/components/dither-kit/dither-paint";
import { PALETTE, type DitherColor, type Seed } from "../src/components/dither-kit/palette";

const FONT_DIR = (pkg: string, file: string) =>
	join(import.meta.dirname, "..", "node_modules", pkg, "files", file);

const FONTS = [
	{
		name: "Geist Pixel",
		data: await readFile(FONT_DIR("@fontsource/geist-pixel", "geist-pixel-latin-400-normal.woff2")),
		weight: 400 as const,
	},
	{
		name: "Geist Variable",
		data: await readFile(FONT_DIR("@fontsource-variable/geist", "geist-latin-wght-normal.woff2")),
	},
	{
		name: "JetBrains Mono",
		data: await readFile(
			FONT_DIR("@fontsource-variable/jetbrains-mono", "jetbrains-mono-latin-wght-normal.woff2"),
		),
	},
];

/** The dither chart block: 5 bars in the site's palette seeds, 44px wide,
 * 18px gaps, 260px tall, dissolving up from an opaque floor. */
const BARS = [
	{ height: 120, color: "green" },
	{ height: 190, color: "blue" },
	{ height: 150, color: "purple" },
	{ height: 230, color: "pink" },
	{ height: 170, color: "orange" },
] as const satisfies readonly { height: number; color: DitherColor }[];

const BAR_COLS = 22; // 44 css px ÷ 2px cells
const GAP_COLS = 9; // 18 css px ÷ 2px cells
const ROWS = 130; // 260 css px ÷ 2px cells
const CELL_PX = 2; // same as dither-kit CELL

/** Rasterize the bars with the app's own paintColumn dither, premultiplied. */
function ditherBars(): RgbaImage {
	const cols = BARS.length * BAR_COLS + (BARS.length - 1) * GAP_COLS;
	const w = cols * CELL_PX;
	const h = ROWS * CELL_PX;
	const data = new Uint8Array(w * h * 4);
	const put = (x: number, y: number, color: string) => {
		const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(color);
		if (!m) throw new Error(`bad dither color: ${color}`);
		const a = Number(m[4]);
		const rgb = [m[1], m[2], m[3]].map((v) => Math.round(Number(v) * a));
		const alpha = Math.round(a * 255);
		// Bake the 2×2 cell upscale so the cells read chunky with no scaling
		// step (matches the web canvas's CELL + image-rendering: pixelated).
		for (let dy = 0; dy < CELL_PX; dy++) {
			for (let dx = 0; dx < CELL_PX; dx++) {
				const i = ((y * CELL_PX + dy) * w + (x * CELL_PX + dx)) * 4;
				data[i] = rgb[0];
				data[i + 1] = rgb[1];
				data[i + 2] = rgb[2];
				data[i + 3] = alpha;
			}
		}
	};
	const octx = {
		fillStyle: "",
		fillRect(this: { fillStyle: string }, x: number, y: number, ww: number, hh: number) {
			for (let dy = 0; dy < hh; dy++) {
				for (let dx = 0; dx < ww; dx++) put(x + dx, y + dy, this.fillStyle);
			}
		},
	} as unknown as CanvasRenderingContext2D;
	BARS.forEach((bar, i) => {
		const base = i * (BAR_COLS + GAP_COLS);
		const rows = Math.round(bar.height / CELL_PX);
		// Anchor the bar on the buffer's bottom edge (top = ROWS - rows) so the
		// dither dissolves up from an opaque floor, like the site charts.
		const top = ROWS - rows;
		for (let c = 0; c < BAR_COLS; c++) {
			paintColumn(octx, base + c, top, ROWS, PALETTE[bar.color], {
				variant: "gradient",
				intensity: 0,
				dim: 1,
				stacked: false,
			});
		}
	});
	return { width: w, height: h, data, premultiplied: true };
}

const bars = ditherBars();
const barsW = bars.width;
const barsH = bars.height;

/** The dither bars with a bloom glow copy overlaid — blur + brightness +
 * saturate at 0.7 opacity, screen-blended, mirroring dither-kit's low preset. */
function DitherChart() {
	return (
		<div tw="relative" style={{ width: barsW, height: barsH }}>
			<Bitmap {...bars} style={{ position: "absolute", inset: 0 }} />
			<div
				style={{
					position: "absolute",
					inset: 0,
					filter: "blur(4px) brightness(1.35) saturate(1.4)",
					opacity: 0.7,
					mixBlendMode: "screen",
				}}
			>
				<Bitmap {...bars} />
			</div>
		</div>
	);
}

function OgCard() {
	return (
		<div tw="w-[1200px] h-[630px] flex flex-col justify-between bg-gradient-to-b from-[#131318] to-[#08080b] p-[64px]">
			<div tw="flex items-center justify-between">
				<div tw="text-[22px] text-white" style={{ fontFamily: "Geist Pixel" }}>
					omastats
				</div>
				<div tw="text-[16px] text-[#52525b]" style={{ fontFamily: "JetBrains Mono" }}>
					github.com/ussego/omastats
				</div>
			</div>

			<div tw="flex items-center justify-between">
				<div tw="flex flex-col gap-[20px]">
					<div tw="text-[92px] leading-none text-white" style={{ fontFamily: "Geist Pixel" }}>
						omastats
					</div>
					<div
						tw="text-[27px] text-[#a1a1aa] max-w-[580px]"
						style={{ fontFamily: "Geist Variable" }}
					>
						Analytics for the Omarchy plugin catalog
					</div>
				</div>
				<DitherChart />
			</div>

			<div tw="flex items-center justify-between text-[15px] text-[#52525b]" style={{ fontFamily: "JetBrains Mono" }}>
				<span>hearts · views · copies · badges</span>
				<span>90-day snapshot history</span>
			</div>
		</div>
	);
}

const png = await render(<OgCard />, { width: 1200, height: 630, fonts: FONTS });

const out = join(import.meta.dirname, "..", "public", "og.png");
await writeFile(out, png);

const sig = png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
if (!sig || png.length < 1000) throw new Error(`og.png looks wrong: ${png.length} bytes`);
console.log(`og.png: ${(png.length / 1024).toFixed(1)} KiB`);

// ------------------------------------------------------------------ favicon

/** The brand glyph raster comes back as PNG — decode to an alpha mask with
 * pngjs (no hand-rolled inflate/unfilter). */
function decodePng(bytes: Uint8Array): { width: number; height: number; rgba: Uint8Array } {
	const png = PNG.sync.read(Buffer.from(bytes));
	return { width: png.width, height: png.height, rgba: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength) };
}

const FAVICON_SIZES = [16, 32, 48] as const;

/** Rasterize the brand glyph — "o" in Geist Pixel — and return its alpha mask.
 * Rendered on a 2× canvas at a big font so the letter fills the tile (Geist
 * Pixel's lowercase x-height is ~0.45em), then center-cropped to size. */
async function glyphMask(size: number): Promise<Uint8Array> {
	const canvas = size * 2;
	const png = await render(
		<div
			style={{
				width: canvas,
				height: canvas,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div tw="text-white" style={{ fontFamily: "Geist Pixel", fontSize: Math.round(canvas * 0.6) }}>
				o
			</div>
		</div>,
		{ width: canvas, height: canvas, fonts: FONTS },
	);
	const { rgba } = decodePng(png);
	const mask = new Uint8Array(size * size);
	// Flex centers the em box, but a pixel font's descender space pushes the
	// visual "o" below center — center the glyph's own bounding box instead.
	let minX = canvas;
	let minY = canvas;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < canvas; y++) {
		for (let x = 0; x < canvas; x++) {
			if (rgba[(y * canvas + x) * 4 + 3] > 40) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}
	const offX = Math.min(Math.max(Math.round((minX + maxX + 1 - size) / 2), 0), canvas - size);
	const offY = Math.min(Math.max(Math.round((minY + maxY + 1 - size) / 2), 0), canvas - size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			mask[y * size + x] = rgba[((y + offY) * canvas + (x + offX)) * 4 + 3];
		}
	}
	return mask;
}

/** The brand glyph dither: the paintColumn dissolve over the whole tile (dense
 * at the bottom, Bayer-scattered upward) in the site's green seed, gated by
 * the glyph mask — 1px cells, favicon scale. */
function ditherGlyph(mask: Uint8Array, size: number, seed: Seed): RgbaImage {
	const data = new Uint8Array(size * size * 4);
	const put = (x: number, y: number, color: string) => {
		if (mask[y * size + x] < 64) return;
		const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(color);
		if (!m) throw new Error(`bad dither color: ${color}`);
		const a = Number(m[4]);
		const i = (y * size + x) * 4;
		data[i] = Math.round(Number(m[1]) * a);
		data[i + 1] = Math.round(Number(m[2]) * a);
		data[i + 2] = Math.round(Number(m[3]) * a);
		data[i + 3] = Math.round(a * 255);
	};
	const octx = {
		fillStyle: "",
		fillRect(this: { fillStyle: string }, x: number, y: number, ww: number, hh: number) {
			for (let dy = 0; dy < hh; dy++) {
				for (let dx = 0; dx < ww; dx++) put(x + dx, y + dy, this.fillStyle);
			}
		},
	} as unknown as CanvasRenderingContext2D;
	for (let x = 0; x < size; x++) {
		paintColumn(octx, x, 0, size, seed, { variant: "gradient", intensity: 0, dim: 1, stacked: false });
	}
	return { width: size, height: size, data, premultiplied: true };
}

/** Rounded-rect inside test shared by the tile raster and the corner mask. */
function inTile(x: number, y: number, size: number): boolean {
	const radius = size * 0.22;
	const px = x + 0.5;
	const py = y + 0.5;
	const rx = Math.min(Math.max(px, radius), size - radius);
	const ry = Math.min(Math.max(py, radius), size - radius);
	const dx = px - rx;
	const dy = py - ry;
	return dx * dx + dy * dy <= radius * radius;
}

/** Composite the rounded dark tile (transparent corners) with the dithered
 * glyph over it. Glyph is premultiplied; tile is opaque. */
function faviconRgba(glyph: RgbaImage, size: number): RgbaImage {
	const data = new Uint8Array(size * size * 4);
	const g = glyph.data as Uint8Array;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			if (!inTile(x, y, size)) continue;
			data[i] = 11;
			data[i + 1] = 11;
			data[i + 2] = 15;
			data[i + 3] = 255;
			const ga = g[i + 3];
			if (ga > 0) {
				data[i] = g[i] + Math.round((11 * (255 - ga)) / 255);
				data[i + 1] = g[i + 1] + Math.round((11 * (255 - ga)) / 255);
				data[i + 2] = g[i + 2] + Math.round((15 * (255 - ga)) / 255);
			}
		}
	}
	return { width: size, height: size, data, premultiplied: true };
}

/** One favicon frame: the rounded dithered tile + a tight bloom glow. */
async function renderFaviconIcon(size: number): Promise<Uint8Array> {
	const mask = await glyphMask(size);
	const glyph = ditherGlyph(mask, size, PALETTE.blue);
	const tile = faviconRgba(glyph, size);
	const raw = await render(
		<div tw="relative" style={{ width: size, height: size }}>
			<Bitmap {...tile} style={{ position: "absolute", inset: 0 }} />
			<div
				style={{
					position: "absolute",
					inset: 0,
					filter: "blur(1px) brightness(1.3) saturate(1.4)",
					opacity: 0.6,
					mixBlendMode: "screen",
				}}
			>
				<Bitmap {...tile} />
			</div>
		</div>,
		{ width: size, height: size, fonts: FONTS },
	);
	// The bloom's blur bleeds tile pixels into the transparent corners (takumi
	// has no overflow clipping) — punch the rounded-corner alpha back through.
	const png = PNG.sync.read(Buffer.from(raw));
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (!inTile(x, y, size)) png.data[(y * size + x) * 4 + 3] = 0;
		}
	}
	return PNG.sync.write(png);
}

/** Pack PNG-compressed frames into a classic ICO container (16/32/48). */
function packIco(frames: { size: number; png: Uint8Array }[]): Uint8Array {
	const header = 6 + 16 * frames.length;
	const out = new Uint8Array(header + frames.reduce((n, f) => n + f.png.length, 0));
	out[2] = 1; // type: ICO
	out[4] = frames.length;
	let offset = header;
	frames.forEach((f, i) => {
		const e = 6 + i * 16;
		out[e] = f.size;
		out[e + 1] = f.size;
		out[e + 4] = 1; // planes
		out[e + 7] = 32; // bitcount (LE bytes 6-7)
		out[e + 8] = f.png.length & 0xff;
		out[e + 9] = (f.png.length >>> 8) & 0xff;
		out[e + 10] = (f.png.length >>> 16) & 0xff;
		out[e + 11] = (f.png.length >>> 24) & 0xff;
		out[e + 12] = offset & 0xff;
		out[e + 13] = (offset >>> 8) & 0xff;
		out[e + 14] = (offset >>> 16) & 0xff;
		out[e + 15] = (offset >>> 24) & 0xff;
		out.set(f.png, offset);
		offset += f.png.length;
	});
	return out;
}

const ico = packIco(
	await Promise.all(FAVICON_SIZES.map(async (size) => ({ size, png: await renderFaviconIcon(size) }))),
);
const icoOut = join(import.meta.dirname, "..", "public", "favicon.ico");
await writeFile(icoOut, ico);
console.log(`favicon.ico: ${ico.length} bytes`);

// Standalone PNG favicon (64px — the .ico stays the primary, this is the
// crisp fallback referenced from renderer.tsx).
const pngOut = join(import.meta.dirname, "..", "public", "favicon.png");
const faviconPng = await renderFaviconIcon(64);
await writeFile(pngOut, faviconPng);
console.log(`favicon.png: ${faviconPng.length} bytes`);

// Decorative console preview of the PNG favicon.
function asciiPreview(png: Uint8Array): string {
	const { width, height, rgba } = decodePng(png);
	let out = "";
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const a = rgba[i + 3];
			if (a < 40) {
				out += " ";
				continue;
			}
			const l = (rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3;
			out += l > 200 ? "#" : l > 140 ? "+" : l > 80 ? ":" : ".";
		}
		out += "\n";
	}
	return out;
}
console.log(asciiPreview(faviconPng));

