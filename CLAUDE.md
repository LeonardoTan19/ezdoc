# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **Bun** as the package manager. The frontend is Vite + React 19; the desktop shell is Tauri 2 (Rust).

```bash
bun install              # install dependencies

bun run dev              # Vite dev server on port 1420 (strict)
bun run tauri dev        # full Tauri app (spawns `bun run dev` automatically)

bun run build            # tsc -b && vite build (type-checks the whole project, then bundles)
bun run typecheck        # tsc --noEmit only
bun run tauri build      # produce desktop bundles

bun run release <major|minor|patch|x.y.z>   # bump versions + generate CHANGELOG scaffold (step 1)
bun run release commit                      # git add, commit, tag (step 2)

bun run lint             # eslint .
bun run format           # prettier --write "**/*.{ts,tsx}"

bunx vitest run          # run all tests once (no `test` script defined in package.json)
bunx vitest              # watch mode
bunx vitest run src/engine/compiler/test/validator.test.ts   # single test file
bunx vitest run -t "name of test"                            # filter by test name
```

Test files live next to the code they cover, under `test/` subdirectories (e.g. `src/engine/compiler/test/`). Vitest is configured for jsdom + globals; the include glob is `src/**/test/**/*.test.ts` and `src/**/*.test.ts`.

Prettier config is non-default: **no semicolons**, **double quotes**, 2-space tabs, 80 col, ES5 trailing commas.

## Architecture

ezdoc is a Markdown-to-styled-document editor. A user authors Markdown, picks a typography "rule" (e.g. a Chinese national standard like GB/T 9704), and the engine compiles that rule into CSS and parses the Markdown into HTML for an A4 paper preview.

### The engine (`src/engine/`)

The engine is **pure TypeScript with no UI dependencies**. The dependency rule is one-directional and load-bearing: `engine/` may import from `engine/` and from npm packages (markdown-it, zod, yaml), but **must never import from `lib/`, `hooks/`, `stores/`, or `components/`**. CSS class names and i18n are UI concerns kept out of the engine — they are injected as parameters or handled by the consuming layer.

`src/engine/index.ts` is the sole public API surface. It deliberately exports only what upper layers need (`compileRule`, `validateRule`, `getBuiltinRules`, `MarkdownParser`, `DEFAULT_HOST`, and types). Internal helpers like `toCssCustomProperty`, `scopeSelectors`, and the sanitize utilities are **not** exported and should stay that way.

Three subsystems:

**Compiler** (`compiler/`) — `compileRule(config, host)` is a ~30-line orchestrator running a three-stage pipeline:
1. `token-generator.ts`: `RuleConfig` → CSS custom-property tokens.
2. `rule-builders/` (root, body, heading, page, print): each has the uniform signature producing `StyleNode[]`. Add a new CSS rule category by writing a new builder and registering it in `compiler.ts`.
3. `serializer.ts`: `StyleNode[]` → CSS text.

`HostSelectors` (in `compiler/types.ts`) is a **required** parameter — there are no hardcoded selectors in the compiler. Callers pass the actual DOM selectors (`.paper-sheet`, etc.); `DEFAULT_HOST` provides a default set. `paperContent` is a compound intersection selector that cannot be composed from the others, so it is injected whole.

**Parser** (`parser/`) — `MarkdownParser` is a thin pipeline runner over a `ParserPipeline` (default: `DEFAULT_PIPELINE`). Five stages: preprocessors (string→string) → markdown-it parse (string→Token[]) → token processors (Token[]→Token[]) → render (Token[]→HTML) → HTML postprocessors (string→string). Processors live in `parser/processors/{preprocess,md-plugins,token}/`. Extend behavior by adding a processor implementing the relevant interface from `parser/types.ts` and registering it in the pipeline — no changes to `MarkdownParser` itself. `parse()` returns `{ html, tokens }`.

**Schema + validation** (`schema/`, `compiler/validator.ts`) — Zod schemas define `RuleConfig`. Built-in rules are YAML files (`builtin-rules/*.yaml`) loaded via `?raw` imports and parsed through `schema/yaml-mapper.ts`. `validateRule()` is hand-written (separate from Zod) and uses a **factory pattern**: `patternValidator`, `setValidator`, `typeValidator` build small `Validator` functions from a regex/set/type. When adding a validation, prefer composing a factory over writing a bespoke function — bespoke validators exist only where the rules genuinely differ (e.g. `validateCssParagraphSpacing` accepts `''` and numeric `0`).

### Error handling

Two independent error-code enums, neither carrying i18n strings: `ValidationErrorCode` (`compiler/types.ts`) and `ParseErrorCode` (`parser/types.ts`). The engine returns structured codes; translation to user-facing messages happens in the upper (React/i18n) layer via an `ERROR_CODE_TO_I18N_KEY` map. Do not introduce translated strings into engine code.

### Tauri shell (`src-tauri/`)

Rust entry is `src-tauri/src/lib.rs`. Note the custom `external-navigation` plugin: external `http(s)/mailto/tel` links are opened in the system browser via `tauri-plugin-opener` and blocked from navigating the webview; internal hosts (localhost, tauri.localhost) navigate normally. The main window starts hidden and is shown on `PageLoadEvent::Finished`. The Cargo package is named `tauri-native` / lib `tauri_native_lib` (not "ezdoc").

## Project context

This codebase is a **migration in progress** from `gov-draft` (Vue 3 + Express) to ezdoc (Tauri + React 19 + shadcn). The engine layer is ported and refactored. The app layer is now substantially built: Zustand stores (`stores/doc-store`, `rule-store`, `settings-store`), hooks (`use-markdown`, `use-paginator`, `use-style-injector`, `use-split-pane`, `use-rule-engine`, `use-file-system`), and a split-pane editor/preview UI (`components/editor/` CodeMirror + Toolbar, `components/preview/` A4Paper) are wired together in `App.tsx`. Settings panels are the main piece still pending.

The authoritative design is **`docs/2026-06-02-govdraft-to-ezdoc-migration-design.md`**; phased execution plans live in **`docs/superpowers/plans/`**. Read the design doc before making structural changes. Key decisions already made there: no `types/` directory (types come from `engine/index.ts`), no `RuleEngine` class (pure functions instead), no adapter layer (React hooks instead), PDF export deferred, `HostSelectors` required with no engine-level default.

## Conventions

- Path alias `@/` → `src/` (configured in both Vite and tsconfig).
- shadcn/ui components go in `src/components/ui/`; icon library is **hugeicons** (per components.json), though lucide-react is also installed.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` and `erasableSyntaxOnly` — type-only imports must use `import type`.
- Release is tag-driven: pushing a `v*` tag triggers `.github/workflows/release.yml` (cross-platform Tauri build). There is no separate CI lint/test workflow.
- `bun run release` is a two-step process: step 1 bumps versions and generates a CHANGELOG scaffold from Conventional Commits; step 2 commits and tags. **After step 1, always review and simplify CHANGELOG.md** — the auto-generated sections are scaffolding. Consolidate redundant entries, drop trivial chore commits, and rewrite bullets into user-facing prose. The raw `### Commits` list at the bottom of each version section is the source of truth.
