# src

## Purpose
Core source for Claude Knowledge Graph CLI: command routing, configuration management, MCP server entry point, installation wizard, and shared utilities for file system/JSON/command operations.

## Key Files
- `cli.ts` — Commander.js CLI entry point; imports `version` directly from `package.json`; routes `install`, `init`, `uninit`, `status`, `sync` commands via dynamic imports to `./commands/` submodules
- `config.ts` — `CkgConfig` interface, read/write with defaults merging; stored at `~/.ckg/config.json`; API key stored in macOS Keychain via `security` CLI, never persisted to disk
- `utils.ts` — Shared utilities: `getCkgDir`, `getClaudeDir`, `ensureDir`, `deepMerge`, `readJsonFile`, `writeJsonFile`, `commandExists`, `runCommand`, `copyFile`, `appendToFile`
- `installer.ts` — Interactive setup wizard: checks CodeGraph, prompts for API key/models/python path, stores API key in macOS Keychain via `storeApiKeyInKeychain()`, saves remaining config via `writeConfig()`
- `mcp-server.ts` — MCP server stub; validates API key via `readConfig()`, placeholder for future CKG-native MCP tools (symbol intelligence delegated to CodeGraph MCP)

## Patterns & Conventions
- **Dynamic imports**: `installer.js`, all subcommands in `cli.ts`, and `inquirer` must be dynamically imported (ESM compatibility — never import statically)
- **Version loading**: `version` is imported directly from `package.json` in `cli.ts`
- **API key security**: `storeApiKeyInKeychain()` stores key in macOS Keychain; `writeConfig()` explicitly strips `anthropic_api_key` before writing; `getApiKey()` checks Keychain → env var → legacy config fallback
- **Config read-modify-write**: `writeConfig()` reads existing config first, merges partial updates, preserves unspecified fields
- **Defaults merging**: `readConfig()` spreads `DEFAULTS` under file contents so missing fields get safe defaults
- **Graceful degradation**: `readJsonFile()` returns default value on any parse/read error
- **Environment fallbacks**: `CKG_CONFIG_DIR` with `??` fallback to `~/.ckg`; never assume env vars are set
- **JSON format**: 2-space indentation + trailing newline via `writeJsonFile()`
- **Directory safety**: all write operations call `ensureDir()` on parent directories first
- **Error display**: `chalk.red()` for errors + `exit(1)` on fatal; `chalk.green()` for success confirmations
- **CLI default action**: running `ckg` with no subcommand triggers the installer for frictionless onboarding
- **Entry point**: `program.parseAsync()` used (not `program.parse()`) to support top-level async actions

## Architecture Decisions
- `deepMerge()` is recursive for objects but replaces arrays and primitives (no array merging)
- MCP server is intentionally minimal — CodeGraph MCP handles symbol lookup; this file exists for future CKG-native tools
- `commandExists()` uses `--version` flag to probe tool availability
- `runCommand()` inherits stdio by default; pass `{ silent: true }` to capture output as string
- Model defaults: `claude-haiku-4-5-20251001` for hooks (fast/cheap), `claude-sonnet-4-6` for init (quality)
- `packageDir()` in installer uses `__dirname` to resolve bundled assets relative to the package root

## Dependencies
- Node built-ins: `fs`, `path`, `child_process`, `module`
- `commander` — CLI parsing and routing
- `chalk` — Colored terminal output
- `inquirer` — Interactive prompts (ESM-only, must be dynamically imported)
- Dependency graph: `config.ts` → `utils.ts`; `installer.ts` → `config.ts` + `utils.ts`; `mcp-server.ts` → `config.ts`

## Do Not
- Import `inquirer`, subcommand modules, or `installer.js` statically — breaks ESM compatibility
- Persist `anthropic_api_key` to config file — always use `storeApiKeyInKeychain()` and rely on `getApiKey()` to retrieve it
- Assume `HOME` or `CKG_CONFIG_DIR` environment variables exist without fallbacks
- Skip `ensureDir()` before writing files
- Bypass config defaults by reading the JSON file directly — always use `readConfig()`
- Execute user-supplied strings through `runCommand()` without validation
- Use `program.parse()` instead of `program.parseAsync()` — subcommand actions are async