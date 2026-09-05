import type { Transition, Variants } from "motion/react"

export const easeOutCubic = [0.215, 0.61, 0.355, 1] as const

export const DIM_OPACITY = 0.4

export type GraphTone = "accent" | "secondary" | "category" | "positive" | "warning" | "negative"

const GRAPH_TONE_CLASSES: Record<GraphTone, string> = {
  accent: "text-graph-accent",
  secondary: "text-graph-accent-2",
  category: "text-graph-accent-3",
  positive: "text-graph-positive",
  warning: "text-graph-warning",
  negative: "text-graph-negative",
}

export function graphToneClass(tone: GraphTone = "accent") {
  return GRAPH_TONE_CLASSES[tone]
}

export function graphTransition(
  reduce: boolean | null,
  extras?: Transition
): Transition {
  if (reduce) {
    return { duration: 0 }
  }

  return {
    duration: 0.22,
    ease: easeOutCubic,
    ...extras,
  }
}

export function fadeUp(reduce: boolean | null): Variants {
  if (reduce) {
    return {
      hidden: { opacity: 1, transform: "translateY(0px)" },
      show: { opacity: 1, transform: "translateY(0px)" },
    }
  }

  return {
    hidden: { opacity: 0, transform: "translateY(8px)" },
    show: {
      opacity: 1,
      transform: "translateY(0px)",
      transition: graphTransition(false),
    },
  }
}

export function staggerList(reduce: boolean | null, stagger = 0.04): Variants {
  return {
    hidden: {},
    show: {
      transition: reduce ? { duration: 0 } : { staggerChildren: stagger },
    },
  }
}

export function fillDelay(reduce: boolean | null, index: number, step = 0.03) {
  if (reduce) {
    return 0
  }

  return Math.min(index * step, 0.28)
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const GLYPH_SETS = {
  shade: ["·", "░", "▒", "▓", "█"],
  ascii: [".", "-", "=", "#", "@"],
  hash: [".", ":", "+", "#", "█"],
  bar: ["▁", "▂", "▃", "▅", "█"],
} as const

export type GlyphSetName = keyof typeof GLYPH_SETS
export type Glyphs = GlyphSetName | readonly string[]

export const INTENSITY_GLYPHS = GLYPH_SETS.shade

export function resolveGlyphs(glyphs?: Glyphs): readonly string[] {
  if (glyphs == null) {
    return GLYPH_SETS.shade
  }

  if (typeof glyphs === "string") {
    return GLYPH_SETS[glyphs] ?? GLYPH_SETS.shade
  }

  return glyphs.length > 0 ? glyphs : GLYPH_SETS.shade
}

export function trackMarks(
  glyphs?: Glyphs,
  fallback: { empty: string; rest: string; fill: string } = {
    empty: "-",
    rest: "░",
    fill: "█",
  }
) {
  if (glyphs == null) {
    return fallback
  }

  const set = resolveGlyphs(glyphs)
  const last = set.length - 1

  return {
    empty: set[0] ?? fallback.empty,
    rest: set[Math.min(1, last)] ?? fallback.rest,
    fill: set[last] ?? fallback.fill,
  }
}

export function intensityLevel(value: number, max: number) {
  if (value <= 0 || max <= 0) {
    return 0
  }

  return Math.max(1, Math.round(clamp01(value / max) * 4))
}

export function intensityGlyph(
  level: number,
  glyphs: readonly string[] = INTENSITY_GLYPHS
) {
  if (glyphs.length === 0) {
    return "·"
  }

  const clamped = Math.min(4, Math.max(0, Math.round(level)))
  const index = Math.round((clamped / 4) * (glyphs.length - 1))
  return glyphs[index] ?? glyphs[0] ?? "·"
}

export function intensityClass(
  level: number,
  palette: GraphPalette = "mono",
  tone: GraphTone = "accent"
) {
  const index = Math.min(4, Math.max(0, Math.round(level)))

  if (index <= 0) {
    return "text-graph-frame"
  }

  if (palette === "mono") {
    if (index <= 2) {
      return "text-graph-muted"
    }

    if (index === 3) {
      return "text-foreground"
    }

    return graphToneClass(tone)
  }

  if (palette === "multi") {
    if (index === 1) {
      return "text-graph-accent-2"
    }

    if (index <= 3) {
      return "text-graph-accent-3"
    }

    return "text-graph-accent"
  }

  if (index <= 2) {
    return "text-graph-accent-2"
  }

  return "text-graph-accent"
}

export type GraphPalette = "mono" | "duo" | "multi"

export function isMonoPalette(palette?: GraphPalette) {
	return palette == null || palette === "mono"
}

export function toneClass(
  palette: GraphPalette | undefined,
  role: "primary" | "secondary" | "idle" | "empty",
  tone: GraphTone = "accent"
) {
  if (role === "empty") {
    return "text-graph-frame"
  }

  if (role === "idle") {
    return "text-graph-muted"
  }

  if (role === "primary") {
    return graphToneClass(tone)
  }

  return isMonoPalette(palette) ? "text-graph-muted" : "text-graph-accent-2"
}

export const GRAPH_TIP_CLASS =
  "pointer-events-none absolute z-20 whitespace-nowrap graph-frame bg-background px-2 py-1 font-mono text-xs uppercase"
