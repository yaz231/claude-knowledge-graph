# hooks

## Purpose
Post-tool-use hook system for maintaining CLAUDE.md files and session logging after Write/Edit/MultiEdit operations. Stop hook appends a session changelog summary to the root CLAUDE.md of each project touched.

## Key Files
- `post_tool_use.py` — Main hook triggered after file-writing tool calls. Updates CLAUDE.md for the affected directory and appends an event to `~/.ckg/session-log.json` for the stop hook to consume.
- `stop.py` — End-of-session hook that reads the session log, groups modified files by project root, generates a unified changelog summary per project via LLM, and appends it to each project's root CLAUDE.md.

## Architecture & Flow
1. **post_tool_use** fires after Write/Edit/MultiEdit → identifies affected directory → scans source files (up to 10 files, 3000 chars each) → calls LLM to generate/update the directory's CLAUDE.md → appends event to session log.
2. **stop** fires at session end → reads `~/.ckg/session-log.json` → groups files by project root → calls LLM with file list + existing root CLAUDE.md context → appends timestamped summary → clears session log.

## Configuration
- Config read from `~/.ckg/config.json` (overridable via `CKG_CONFIG_DIR` env var).
- Required: `anthropic_api_key`. Optional: `hook_model` (defaults to `claude-haiku-4-5-20251001`).
- Errors logged to `~/.ckg/logs/hook-errors.log`.
- Session state stored in `~/.ckg/session-log.json` (written by post_tool_use, read/cleared by stop).

## Shared Utility Pattern
Both hooks duplicate the same helper functions rather than importing a shared module:
- `get_ckg_dir()` — resolves `~/.ckg` or `CKG_CONFIG_DIR`.
- `get_log_path()` — returns `~/.ckg/logs/hook-errors.log`.
- `log_error(msg)` — timestamped error append to log file.
- `load_config()` — reads `~/.ckg/config.json`, returns `{}` if missing.

## File Scanning Rules (post_tool_use)
- Recognized source extensions: `.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.rs`, `.java`, `.rb`, `.php`, `.c`, `.cpp`, `.h`, `.hpp`, `.cs`, `.swift`, `.kt`, `.scala`, `.sh`, `.yaml`, `.yml`, `.toml`, `.json`, `.md`, `.sql`, `.html`, `.css`, `.scss`.
- **Skip directories**: `node_modules`, `.git`, `__pycache__`, `dist`, `build`, `.next`, `venv`, `.env`, `.temp`, `worktrees`, `.codegraph`.
- Files larger than 100KB are skipped (placeholder logged).
- CLAUDE.md itself is excluded from source file listings.
- Analysis capped at 10 source files and 3000 chars per file to keep LLM prompts efficient.

## Project Root Detection
Auto-detected by walking up the directory tree to find `package.json`, `pyproject.toml`, `.git`, `go.mod`, or `Cargo.toml`.

## Stop Hook Summary Format
- Timestamp (UTC), modified files list, inferred changes (2–5 bullets), affected directories.
- Preserves last 3000 chars of existing root CLAUDE.md for context when generating the summary.
- Guards against recursive hook triggers via a `stop_hook_active` flag.

## Dependencies
- `anthropic` SDK for LLM-based content generation.
- Python 3.10+ (uses `list[Path]` type hints, `Path` extensively).
- No external dependencies beyond `anthropic`; uses only stdlib otherwise.

## Conventions
- Gracefully handle missing config or API key by logging and returning early.
- Do not include any skip directories in analysis.
- Do not read files larger than 100KB.
- Do not trigger hooks recursively (stop hook guards against this).