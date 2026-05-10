# scripts

## Purpose
One-time initialization utility for generating CLAUDE.md files across a codebase via the Anthropic API. Recursively crawls directories, infers project metadata, and creates structured documentation for each directory.

## Key Files
- `init_claude_md.py` – Main entry point. Walks directories, reads source files, calls Claude API to generate a CLAUDE.md per directory.

## Usage
```bash
python init_claude_md.py [--path .] [--dry-run] [--ignore-file .ckgignore]
```
- `--dry-run` mode available for testing without making API calls.

## Conventions
- Respects `.ckgignore` patterns and `ALWAYS_SKIP` set (`node_modules`, `.git`, `__pycache__`, `dist`, `build`, `.next`, `venv`, `.env`, `.temp`, `worktrees`, `.codegraph`)
- Caps files per directory at `MAX_FILES_PER_DIR = 20` to manage API context size
- Skips files larger than `MAX_FILE_BYTES = 100KB`
- Only processes files with recognized `SOURCE_EXTENSIONS` (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.rs`, `.java`, `.rb`, `.php`, `.c`, `.cpp`, `.h`, `.hpp`, `.cs`, `.swift`, `.kt`, `.scala`, `.sh`, `.yaml`, `.yml`, `.toml`, `.json`, `.md`, `.sql`, `.html`, `.css`, `.scss`)
- Auto-detects tech stack from manifest files: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`
- Root-level CLAUDE.md includes project metadata; subdirectory CLAUDE.md files focus on local purpose
- Existing CLAUDE.md content is preserved and passed to the API for incremental updates

## Dependencies / Relationships
- Requires CKG config at `~/.ckg/config.json` (or `$CKG_CONFIG_DIR/config.json`) for Claude API credentials
- Config is created by `ckg install`; script exits with an error if missing
- Uses the Anthropic Python SDK client for generation

## Architectural Decisions
- Single-pass recursive walk with skip logic applied at directory name level before descent
- File content is read and included inline in the API prompt, bounded by size and count limits
- Ignore patterns use `fnmatch` for glob-style matching, consistent with `.gitignore` conventions
- Graceful handling of `PermissionError` and read failures—directories/files are silently skipped
- `CLAUDE.md` itself is excluded from file listings sent to the API to avoid circular references

## Do Not
- Do not modify the `ALWAYS_SKIP` set without understanding downstream effects on all projects using this tool
- Do not include `CLAUDE.md` itself in file listings sent to the API
- Do not process binary or non-source files
- Do not remove existing CLAUDE.md content—always preserve and update

## Notes
- Designed as a one-time initialization tool; incremental updates are handled by other components
- The `get_ckg_dir()` function supports override via `CKG_CONFIG_DIR` environment variable for testing