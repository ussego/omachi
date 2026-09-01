<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `bunx --bun @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx --bun @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Imports

Use the `@/` alias for imports between modules under `src/` (for example, `@/db/schema` or `@/lib/api-types`) instead of traversing parent directories with `../../` paths.

## Agent skills

### Issue tracker

Issues and specs live as local Markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repo using root `CONTEXT.md` and `docs/adr/` when those docs are created. See `docs/agents/domain.md`.
