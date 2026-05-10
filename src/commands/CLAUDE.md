# src/commands

## Purpose
CLI command handlers. Implements `init`, `uninit`, `status`, and `sync` commands for managing CKG in target directories.

## Key Files
- **init.ts** - Implements `runInit()` to orchestrate CKG initialization:
  - Runs `codegraph init` to index the target directory
  - Executes `init_claude_md.py` script to generate CLAUDE.md files
  - Respects python_path from config or override parameter
  - Gracefully handles failures with warnings rather than hard errors
- **uninit.ts** - Implements `runUninit()` to remove CKG from a directory:
  - Removes `.codegraph/` directory recursively
  - Leaves CLAUDE.md files in place for manual cleanup
  - Reports what was removed with status messages
- **status.ts** - Implements `runStatus()` to report CKG state:
  - Checks if `.codegraph/` directory exists and reports CodeGraph initialization status
  - Counts CLAUDE.md coverage across all directories (excluding SKIP_DIRS)
  - Reports root CLAUDE.md size in KB
  - Color-codes coverage percentage (green ≥80%, yellow ≥50%, red <50%)
  - Attempts to run `codegraph status` for additional context
- **sync.ts** - Implements `runSync()` to update indexed CKG:
  - Re-indexes CodeGraph via `codegraph index`
  - Regenerates stale CLAUDE.md files using `init_claude_md.py`
  - Gracefully handles failures with warnings rather than hard errors

## Dependencies / Relationships
- Imports from `../config.js` — reads python_path configuration (init.ts, sync.ts)
- Imports from `../utils.js` — getCkgDir() for script location resolution (init.ts, sync.ts)
- Calls external tools: `codegraph` CLI, Python script at `scripts/init_claude_md.py` (init.ts, sync.ts)
- Uses chalk for colored console output
- Uses child_process.execSync for running external commands

## Notes
- Initialization, uninitialization, status checks, and sync operations are non-blocking
- Python path is configurable, with override parameter taking precedence (init.ts)
- Script path is resolved dynamically via getCkgDir() to support different installation locations
- CLAUDE.md files are intentionally preserved during uninit to avoid accidental data loss
- Status command skips common build/cache directories: node_modules, .git, __pycache__, dist, build, .next, venv, .temp, worktrees
- Coverage calculation only counts directories with non-CLAUDE.md files
- Sync command gracefully handles codegraph index and CLAUDE.md regeneration failures with warnings
