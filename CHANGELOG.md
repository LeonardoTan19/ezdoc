# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.1] - 2026-06-19

### Performance

- Faster incremental editing: the parser now caches block-level tokens and reuses them across edits, and skips the linkify scan entirely on documents with no links.

### Fixed

- Page splitting now keeps partial trailing text that follows inline elements, so content no longer drops at page boundaries.
- Release workflow: the summary step is pinned to bash so it runs identically on all platforms (previously failed on Windows runners under PowerShell), and the linkify optimization now builds cleanly under `tsc -b`.

### Commits

- 680693c fix(parser): type fast-linkify access to markdown-it private __rules__
- 374549b fix(ci): run release summary step with bash on all platforms
- 800c8f7 perf(parser): add block-level token cache for incremental markdown parsing
- 01e0131 perf(parser): skip linkify scan on link-free documents
- bb49fe1 test: audit and improve test coverage across all modules
- 522e6fb fix(paginator): include partial trailing text after inline elements during page split

## [0.1.0] - 2026-06-10

First release of ezdoc — a Tauri + React Markdown-to-styled-document editor.

### Highlights

- **Typesetting engine**: Pure TypeScript engine migrated from gov-draft with a pipeline architecture (compiler: token generation → rule builders → CSS serialization; parser: preprocess → markdown-it → token process → render → postprocess). Rule config validated via Zod schemas. Built-in YAML rules include GB/T 9704 and other typographic standards.
- **Split-pane editor**: CodeMirror 6 editing area + A4 paper preview, with draggable split ratio and a toolbar for common Markdown operations (bold/italic/headings/lists).
- **Paginated preview**: Automatic page-splitting algorithm driven by rule config, with precise pagination based on charsPerLine and line height.
- **CJK character-grid layout**: Fixed-width character-grid typesetting for Chinese typography via charsPerLine configuration.
- **i18n**: react-i18next with built-in Chinese and English UI. Engine error codes are mapped to user-readable messages in the UI layer.
- **State management**: Zustand stores (document content, rule selection, editor settings) integrated with the engine via React hooks.

### Fixes

- Fix paginator page-splitting accuracy and pagination position calculation
- Fix heading style index not correctly derived from rule content.style.index
- Fix builtin-rules: missing charsPerLine, quote/book-title font configuration
- Fix TypeScript compilation errors under erasableSyntaxOnly strict mode

### Commits

- 56a5ebf fix: resolve TypeScript compilation errors under erasableSyntaxOnly
- 4e6a7cd chore: bootstrap project infrastructure
- 743d358 fix(paginator): improve page splitting accuracy and pagination position
- ef191e8 fix(parser): derive headingStyles from rule content.style.index
- 126c710 fix(builtin-rules): add charsPerLine, fix quote/book-title fonts, update pagination
- 7b89588 feat(engine): add CJK character-grid letter-spacing via charsPerLine
- 0a31834 feat(app): integrate editor and preview with split pane
- 2dcc120 fix(toolbar): optimize subscriptions, improve accessibility
- 9550b2f fix(editor): prevent stale onChange closure and remove no-op theme
- c411a57 feat(editor): add Toolbar component, fix locale interpolation to react-i18next double-brace syntax
- ff0e551 feat(preview): add A4Paper preview component with pagination
- a4970d3 feat(ui): generate shadcn input, label, checkbox, select, sheet components
- f41ec7c feat(editor): add CodeMirror React editor component
- 7685d0e fix(hooks): fix split-pane style leak, file-system dep churn, paginator clamp/cleanup, lazy parser init
- 96f6a14 feat(hooks): add engine + store integration hooks
- 3c9dde5 fix(stores): guard rule hydration and dedupe settings defaults
- 3624f10 feat(stores): add rule, doc, and settings Zustand stores
- 4f18527 refactor(locales): drop SSR guards, dedupe locale resolution
- 321d05d feat(app): set up react-i18next with ported gov-draft locales
- bc70973 feat(app): install i18n/zustand deps and copy error-messages mapping
- 7d8bccb fix(engine): resolve lint errors in parser pipeline
- f63a28e refactor(engine): pipeline architecture, validator factory, HostSelectors injection, parser pipeline, pure-function API
- 0da19ff feat(engine): migrate engine layer from gov-draft with green test baseline
- 6a6449c feat: initial commit

[Unreleased]: https://github.com/LeonardoTan19/ezdoc/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/LeonardoTan19/ezdoc/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/LeonardoTan19/ezdoc/releases/tag/v0.1.0
