# Claude Knowledge Graph

> Semantic code intelligence + persistent project memory for Claude Code — in one command.

[![npm version](https://img.shields.io/npm/v/@yaz231/claude-knowledge-graph.svg)](https://www.npmjs.com/package/@yaz231/claude-knowledge-graph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

---

## What is this?

Claude Code is powerful, but out of the box it explores codebases the slow way — spawning agents that grep, glob, and read dozens of files just to answer "how does X work?" And when a session ends, everything Claude learned about your project is gone.

**Claude Knowledge Graph (CKG)** solves both problems by combining two systems:

**Layer 1 — CodeGraph (symbol intelligence)**
A pre-indexed SQLite graph of your codebase — functions, classes, imports, call chains. Claude queries the graph instead of scanning files. Result: 90%+ fewer tool calls, sessions that start fast and stay fast.

**Layer 2 — CLAUDE.md memory (narrative intelligence)**
Auto-generated, auto-maintained documentation for every directory in your project. Why decisions were made, what patterns to follow, what changed last session. Claude reads this context at the start of every session — it knows your project before you type a single word.

Together, they make Claude Code feel like a developer who's been on your team for months.

---

## Quick Start

```bash
npx @yaz231/claude-knowledge-graph
```

The interactive installer will:
- Install [CodeGraph](https://github.com/colbymchenry/codegraph) globally if not already installed
- Prompt for your Anthropic API key (stored securely in macOS Keychain)
- Configure Claude Code hooks and MCP server automatically
- Optionally initialize your current project

Then restart Claude Code.

---

## Requirements

- **Node.js** 18+
- **Python** 3.8+ with `anthropic` package (`pip install anthropic`)
- **Claude Code** ([install here](https://docs.anthropic.com/claude-code))
- **Anthropic API key** ([get one here](https://console.anthropic.com/))
- macOS, Linux, or Windows (Keychain storage on macOS only; other platforms use env var)

---

## How It Works

### On install
CKG configures two things globally in Claude Code:

1. **MCP server** — CodeGraph runs as a local MCP server, exposing tools like `codegraph_search`, `codegraph_callers`, and `codegraph_impact` directly to Claude
2. **Hooks** — Two Python hooks are registered:
   - `PostToolUse` — fires after every file write/edit, updates that directory's `CLAUDE.md` via Anthropic API
   - `Stop` — fires at session end, appends a changelog summary to the project's root `CLAUDE.md`

### On `ckg init <project>`
1. CodeGraph indexes your codebase into a local SQLite database (`.codegraph/`)
2. `init_claude_md.py` recursively crawls every directory and generates a `CLAUDE.md` using your configured model (Sonnet or Opus)
3. From that point on, hooks keep everything current automatically

### During Claude Code sessions
- Claude queries the symbol graph instead of scanning files — exploration is near-instant
- Claude reads `CLAUDE.md` files for narrative context before starting work
- Every file edit silently updates the relevant `CLAUDE.md`
- Every session end appends a changelog to the root `CLAUDE.md`

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `ckg` / `ckg install` | Run interactive installer |
| `ckg init [path]` | Initialize CKG in a project |
| `ckg uninit [path]` | Remove CKG from a project |
| `ckg status [path]` | Show CodeGraph stats + CLAUDE.md coverage |
| `ckg sync [path]` | Re-index CodeGraph + regenerate stale CLAUDE.md files |
| `ckg --version` | Show installed version |

---

## Adding a New Project

```bash
ckg init ~/Projects/my-project
```

For projects with Python virtual environments or large generated directories, create a `.ckgignore` first:

```bash
cat > ~/Projects/my-project/.ckgignore << 'EOF'
.venv
venv
node_modules
.next
dist
.turbo
__pycache__
coverage
EOF

ckg init ~/Projects/my-project
```

Then open the project in Claude Code and work normally. Everything runs invisibly from there.

---

## Configuration

Config lives at `~/.ckg/config.json`:

```json
{
  "python_path": "/opt/homebrew/bin/python3.11",
  "hook_model": "claude-haiku-4-5-20251001",
  "init_model": "claude-sonnet-4-6"
}
```

| Key | Description | Default |
|-----|-------------|---------|
| `python_path` | Python interpreter used to run hooks | `python3` |
| `hook_model` | Model for per-file CLAUDE.md updates (runs frequently) | `claude-haiku-4-5-20251001` |
| `init_model` | Model for initial project crawl (runs once) | `claude-sonnet-4-6` |

The Anthropic API key is stored in macOS Keychain (not in this file). On other platforms, set `ANTHROPIC_API_KEY` as an environment variable.

---

## Monorepo Support

CKG handles monorepos correctly. The `infer_project_root` function walks up from any modified file until it finds a `.git` directory, ensuring session changelogs always go to the true repo root — not a nested `package.json` in `apps/web`.

Add a `.ckgignore` at the monorepo root to skip workspace package directories that don't need separate CLAUDE.md coverage.

---

## Troubleshooting

**Hooks not firing**
Restart Claude Code fully (not just a new session). On VS Code: `Cmd+Shift+P` → "Developer: Reload Window".

**`ckg` command not found after install**
```bash
npm install -g @yaz231/claude-knowledge-graph
```

**Check for hook errors**
```bash
cat ~/.ckg/logs/hook-errors.log
```

**Test hooks manually**
```bash
# PostToolUse
echo '{"tool_name": "Write", "tool_input": {"file_path": "/absolute/path/to/file.ts"}, "tool_response": {}}' \
  | python3 ~/.claude/hooks/post_tool_use.py

# Stop
echo '{"stop_hook_active": false}' \
  | python3 ~/.claude/hooks/stop.py
```

**`.venv` or `node_modules` being crawled**
Create a `.ckgignore` at your project root before running `ckg init`. See [Adding a New Project](#adding-a-new-project).

**API key not found**
On macOS, the key is stored in Keychain under the service name `claude-knowledge-graph`. If it's missing, re-run `ckg install`. On other platforms, ensure `ANTHROPIC_API_KEY` is set in your environment.

---

## Architecture

```
~/.claude/
├── CLAUDE.md              ← Global CKG instructions for Claude
├── hooks/
│   ├── post_tool_use.py   ← Updates CLAUDE.md after every file edit
│   └── stop.py            ← Appends session changelog at session end
└── settings.json          ← Hook registrations (deep-merged, never overwritten)

~/.claude.json             ← CodeGraph MCP server registration

~/.ckg/
├── config.json            ← CKG config (no API key — stored in Keychain)
├── scripts/
│   └── init_claude_md.py  ← One-time project crawler
├── session-log.json       ← Live session event buffer
└── logs/
    └── hook-errors.log    ← Hook error log

your-project/
├── .codegraph/            ← CodeGraph SQLite index (local, gitignored)
├── .ckgignore             ← Directories to skip during CLAUDE.md crawl
├── CLAUDE.md              ← Root context + session changelogs
└── src/
    └── CLAUDE.md          ← Per-directory context (auto-maintained)
```

---

## Privacy & Security

- **100% local** — no data leaves your machine except Anthropic API calls for CLAUDE.md generation
- **API key** stored in macOS Keychain, not in any config file
- **CodeGraph** runs entirely locally — SQLite only, no external services
- `.codegraph/` should be added to `.gitignore` (contains your full codebase index)

---

## Contributing

This is primarily a personal tool published open source. PRs are welcome but response time is not guaranteed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for local dev setup and testing instructions.

---

## License

MIT © [yaz231](https://github.com/yaz231)

---

*Built for the Claude Code community. Combines [CodeGraph](https://github.com/colbymchenry/codegraph) by [@colbymchenry](https://github.com/colbymchenry) with a hierarchical CLAUDE.md auto-generation system.*