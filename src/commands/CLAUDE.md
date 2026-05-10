# src/commands

## Purpose
CLI command handlers for managing Claude Knowledge Graph (CKG) in target directories. Implements `init`, `uninit`, `status`, and `sync` commands.

## Key Files
- **init.ts** — `runInit(targetPath, pythonPathOverride?)`: Runs `codegraph init` then `init_claude_md.py` to generate CLAUDE.md files. Python path resolved from override → config → default.
- **uninit.ts** — `runUninit(targetPath)`: Removes `.codegraph/` directory but intentionally preserves CLAUDE.md files to avoid accidental data loss.
- **status.ts** — `runStatus(targetPath)`: Reports CKG state — checks `.codegraph/` existence, calculates CLAUDE.md coverage across directories (color-coded: green ≥80%, yellow ≥50%, red <50%), reports root CLAUDE.md size.
- **sync.ts** — `runSync(targetPath)`: Re-indexes via `codegraph index` then regenerates stale CLAUDE.md files using the Python script.

## Patterns & Conventions
- **Graceful failure**: All external command invocations (`codegraph`, Python scripts) are wrapped in try/catch with `chalk.yellow` warnings — never hard errors. Commands continue executing subsequent steps after failures.
- **Consistent output style**: `chalk.cyan` for operation start, `chalk.dim` for sub-step progress, `chalk.green('✓')` for success, `chalk.yellow('⚠')` for warnings, `chalk.bold.green('✓')` for final completion.
- **All functions are async** returning `Promise<void>`, even though current implementations use `execSync`.
- **Path resolution**: All commands resolve `targetPath` to absolute via `path.resolve()` at the top.
- **External tool execution**: Uses `child_process.execSync` with `stdio: 'inherit'` for interactive output, except status which uses `stdio: 'pipe'` to capture and reformat output.

## Dependencies
- `../config.js` — `readConfig()` for python_path configuration (init.ts, sync.ts)
- `../utils.js` — `getCkgDir()` for resolving script locations (init.ts, sync.ts)
- External tools: `codegraph` CLI, `scripts/init_claude_md.py` Python script
- `chalk` for colored output, `fs` for filesystem operations

## Architecture Notes
- init and sync both call the same Python script (`init_claude_md.py`) but init first runs `codegraph init` while sync runs `codegraph index`
- sync.ts does NOT support `pythonPathOverride` — it always reads from config (unlike init.ts)
- uninit.ts is the only command that doesn't depend on config or utils
- Status skips directories: `node_modules`, `.git`, `__pycache__`, `dist`, `build`, `.next`, `venv`, `.temp`, `worktrees`
- Coverage counts only directories containing non-CLAUDE.md files as eligible