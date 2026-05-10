```markdown
# hooks

## Purpose
Post-tool-use hook system for maintaining CLAUDE.md files and session logging after Write/Edit/MultiEdit operations.
Stop hook appends session changelog summary to root CLAUDE.md of each project touched.

## Key Files
- `post_tool_use.py` — Main hook implementation that updates CLAUDE.md for affected directories and logs session events.
- `stop.py` — End-of-session hook that generates and appends a summary to each project's root CLAUDE.md.

## Conventions
- Reads config from `~/.ckg/config.json` (Anthropic API key, hook model).
- Maintains session log at `~/.ckg/session-log.json` (appended by post_tool_use, read by stop hook).
- Errors logged to `~/.ckg/logs/hook-errors.log`.
- Uses claude-haiku-4-5-20251001 by default for CLAUDE.md generation.
- Stop hook groups files by project root and generates a unified summary per project.
- Stop hook clears session log after processing.

## Dependencies / Relationships
- Anthropic SDK (`anthropic`) for LLM-based content generation.
- Invoked after tool execution to update directory documentation.
- post_tool_use writes to session-log.json; stop hook reads and clears it.
- Stop hook prevents hook-triggered-by-hook loops via `stop_hook_active` flag.

## Do Not
- Include node_modules, .git, __pycache__, dist, build, .next, venv, .env, .temp, worktrees, .codegraph in analysis.
- Read files larger than 100KB.
- Skip CLAUDE.md itself when listing source files.

## Notes
- Auto-detects project root via package.json, pyproject.toml, .git, go.mod, or Cargo.toml.
- Caps file analysis at 10 source files and 3000 chars per file to keep prompts efficient.
- Gracefully handles missing config or API key by logging and returning early.
- Stop hook preserves last 3000 chars of existing root CLAUDE.md for context when generating summary.
- Summary format: timestamp, modified files, inferred changes, affected directories.
```
