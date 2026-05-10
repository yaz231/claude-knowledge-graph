# src

## Purpose
CLI command infrastructure, configuration management, utility functions for file system operations, JSON handling, command execution, and installation workflow for Claude Knowledge Graph. MCP server entry point for future CKG-native MCP tools.

## Key Files
- `cli.ts` — Commander.js CLI entry point; routes commands to subcommands
- `config.ts` — Configuration interface, read/write operations with defaults
- `utils.ts` — Core utility functions
- `installer.ts` — Interactive setup wizard for CKG initialization
- `mcp-server.ts` — MCP server entry point; delegates symbol intelligence to CodeGraph MCP server; placeholder for future CKG-native MCP tools
- `commands/` — Subcommand implementations (init, uninit, status, sync)

## Conventions
- Directory paths via environment variables (`CKG_CONFIG_DIR`, `HOME`)
- JSON files stored with 2-space indentation and trailing newline
- Command execution wrapped with error handling
- Configuration merges with defaults on read
- Inquirer used for interactive CLI prompts (imported dynamically as ESM)
- Model selection offers tier-specific choices (fast/cheap vs. quality)
- Commander.js for CLI routing; async actions with dynamic imports for subcommands
- MCP server configured in `~/.claude.json`; CKG delegates to CodeGraph MCP for symbol lookup

## Dependencies / Relationships
- Node.js built-ins: `fs`, `path`, `child_process`
- `cli.ts` depends on `installer.ts` and `commands/*` subcommands; orchestrates routing
- `config.ts` depends on `utils.ts` (`getCkgDir`, `readJsonFile`, `writeJsonFile`)
- `installer.ts` depends on both `config.ts` and `utils.ts`; orchestrates setup flow
- `mcp-server.ts` depends on `config.ts`; validates Anthropic API key before startup
- `chalk` for colored console output
- `commander` for CLI parsing and routing
- `inquirer` (ESM, dynamic import) for prompts
- Used across codebase for common operations

## Do Not
- Assume environment variables are set (use fallbacks with `??` operator)
- Execute untrusted commands directly
- Modify file permissions or ownership in utilities
- Bypass default configuration values when reading config
- Import inquirer statically (must use dynamic import due to ESM-only package)
- Import subcommands statically (use dynamic imports in action handlers)

## Notes
- `CkgConfig` interface defines required fields; read operations merge with `DEFAULTS`
- Config stored at `${CKG_CONFIG_DIR}/config.json`
- `readConfig()` gracefully handles missing/invalid config files via `readJsonFile()` default handling
- `writeConfig()` performs read-modify-write to preserve unspecified fields
- `deepMerge()` recursively merges objects but preserves non-object values
- `readJsonFile()` returns default value on parse errors (graceful degradation)
- `runCommand()` inherits stdio by default; use `silent: true` to suppress output
- All file operations ensure parent directories exist via `ensureDir()`
- Installer validates CodeGraph availability and prompts for installation
- Installer copies Python hook scripts (`post_tool_use.py`, `stop.py`) to `~/.claude/hooks/`
- Installer copies init script (`init_claude_md.py`) to `~/.ckg/scripts/`
- Installer merges hook configurations into `~/.claude/settings.json` with deep merge preservation
- MCP server requires `anthropic_api_key` in config; exits with error if not configured
- MCP server currently delegates symbol intelligence to CodeGraph MCP; future expansion planned for CKG-native MCP tools (e.g., CLAUDE.md search)
- CLI version 0.1.0; default action runs installer; error handling with chalk.red() and exit(1)
