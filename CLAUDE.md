# (root)

## Purpose
NPM package: `@yaz231/claude-knowledge-graph` — semantic code intelligence + persistent project memory for Claude Code.

Installs CodeGraph (symbol indexing via MCP) + auto-generated CLAUDE.md files (directory context via Anthropic API) into Claude Code sessions.

## Key Files
- `README.md` — comprehensive user docs (Quick Start, Layer 1/2 architecture, CLI reference, config table, requirements, contributing)
- `CONTRIBUTING.md` — dev setup, testing instructions (environment variables, manual hook testing), coding conventions, release process
- `package.json` — project metadata, dependencies, build scripts, CLI entrypoint
- `tsconfig.json` — TypeScript compiler config (target ES2020, strict mode, source maps enabled)
- `.gitignore` — excludes node_modules, dist, build artifacts, env files, logs, OS files

## Conventions
- TypeScript source in `src/` compiled to `dist/` via tsconfig
- CLI entry: `./dist/cli.js` (command: `ckg`)
- Node ≥18.0.0 required
- Strict mode enabled; declaration maps and source maps generated for debugging
- Config stored at `~/.ckg/config.json`; hooks in `~/.claude/hooks/`; CodeGraph MCP in `~/.claude.json`
- TypeScript strict mode — no `any` without explanatory comment
- All async functions require proper error handling
- Python hooks must never crash Claude Code — wrap in `try/except`, log to `~/.ckg/logs/`
- Deep-merge all JSON config files — never overwrite existing keys
- Comments only for *why*, never *what*

## Dependencies / Relationships
- **Peer**: `@colbymchenry/codegraph` (symbol indexing; registered as MCP server)
- **Runtime**: commander, inquirer, chalk (CLI framework + UX)
- **Dev**: TypeScript, @types/node, @types/inquirer
- Subdirectories: `hooks/` (Python PostToolUse/Stop), `scripts/` (Python init crawler), `src/` (Node CLI)

## Notes
- Published to npm as scoped package (`@yaz231/...`)
- MIT licensed; repo: github.com/yaz231/claude-knowledge-graph
- Requires Python 3.8+ with `anthropic` package for CLAUDE.md generation
- Two-layer architecture: CodeGraph (symbol queries) + CLAUDE.md (narrative memory) auto-updated via hooks
- Use `CKG_CONFIG_DIR` env var to redirect config/hooks to temp directory for isolated testing
- Release: `npm run build` → `npm version [patch|minor|major]` → `npm publish --access public`
