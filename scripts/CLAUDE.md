# scripts

## Purpose
One-time initialization utility for generating CLAUDE.md files across a codebase via Anthropic API.
Recursively crawls directories, infers project metadata, and creates documentation.

## Key Files
- `init_claude_md.py` – Main entry point. Walks directories, calls Claude API to generate CLAUDE.md per directory.

## Conventions
- Respects `.ckgignore` patterns and `ALWAYS_SKIP` set (node_modules, .git, __pycache__, etc.)
- Caps files per directory at 20 to manage context size
- Skips files >100KB, non-source extensions
- Auto-detects tech stack from package.json, pyproject.toml, go.mod, Cargo.toml
- Generates root-level CLAUDE.md with project metadata; subdirectory docs focused on local purpose

## Dependencies / Relationships
- Requires CKG config at `~/.ckg/config.json` (Claude API credentials)
- Uses Anthropic API client for generation
- Integrates with codebase ignore patterns

## Do Not
- Do not modify CLAUDE.md files that already exist (preserve and update only)
- Do not include CLAUDE.md itself in file listings
- Do not process binary or non-source files

## Notes
- Designed as one-time initialization tool; incremental updates handled separately
- Dry-run mode available for testing without API calls
- Handles permission errors and read failures gracefully
