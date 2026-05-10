# src

## Purpose
Core source for Claude Knowledge Graph CLI: command routing, configuration management, MCP server entry point, installation wizard, and shared utilities for file system/JSON/command operations.

## Key Files
- `cli.ts` — Commander.js CLI entry point; routes `install`, `init`, `uninit`, `status`, `sync` commands via dynamic imports to `./commands/` submodules
- `config.ts` — `CkgConfig` interface, read/write with defaults merging; stored at `~/.ckg/config.json`
- `utils.ts` — Shared utilities: `getCkgDir`, `getClaudeDir`, `ensureDir`, `deepMerge`, `readJsonFile`, `writeJsonFile`, `commandExists`, `runCommand`, `copyFile`, `appendToFile`
- `installer.ts` — Interactive setup wizard: checks CodeGraph, prompts for API key/models/python path, copies hook scripts, configures `~/.claude/settings.json`
- `mcp-server.ts` — MCP server stub; validates API key, placeholder for future CKG-native MCP tools (symbol intelligence delegated to CodeGraph MCP)

## Patterns & Conventions
- **Dynamic imports**: subcommands in `cli.ts` and `inquirer` in `installer.ts` are imported dynamically (ESM compatibility requirement)
- **Config read-modify-write**: `writeConfig()` reads existing config first, merges partial updates, preserves unspecified fields
- **Defaults merging**: `readConfig()` spreads `DEFAULTS` under file contents so missing fields get safe defaults
- **Graceful degradation**: `readJsonFile()` returns default value on any parse/read error
- **Environment fallbacks**: `CKG_CONFIG_DIR` with `??` fallback to `~/.ckg`; never assume env vars are set
- **JSON format**: 2-space indentation + trailing newline via `writeJsonFile()`
- **Directory safety**: all write operations call `ensureDir()` on parent directories first
- **Error display**: `chalk.red()` for errors + `exit(1)` on fatal; `chalk.green()` for success confirmations
- **CLI default action**: running `ckg` with no subcommand triggers the installer for frictionless onboarding

## Architecture Decisions
- `deepMerge()` is recursive for objects but replaces arrays and primitives (no array merging)
- MCP server is intentionally minimal — CodeGraph MCP handles symbol lookup; this file exists for future CKG-native tools
- `commandExists()` uses `--version` flag to probe tool availability
- `runCommand()` inherits stdio by default; pass `{ silent: true }` to capture output as string
- Model defaults: `claude-haiku-4-5-20251001` for hooks (fast/cheap), `claude-sonnet-4-6` for init (quality)
- `packageDir()` in installer uses `__dirname` to resolve bundled assets relative to the package root

## Dependencies
- Node built-ins: `fs`, `path`, `child_process`
- `commander` — CLI parsing and routing
- `chalk` — Colored terminal output
- `inquirer` — Interactive prompts (ESM-only, must be dynamically imported)
- Dependency graph: `config.ts` → `utils.ts`; `installer.ts` → `config.ts` + `utils.ts`; `mcp-server.ts` → `config.ts`

## Do Not
- Import `inquirer` or subcommand modules statically — breaks ESM compatibility
- Assume `HOME` or `CKG_CONFIG_DIR` environment variables exist without fallbacks
- Skip `ensureDir()` before writing files
- Bypass config defaults by reading the JSON file directly — always use `readConfig()`
- Execute user-supplied strings through `runCommand()` without validation