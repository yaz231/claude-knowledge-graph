# Contributing to Claude Knowledge Graph

This is primarily a personal tool published open source. PRs are welcome, but response time is not guaranteed.

## Local Dev Setup

```bash
git clone https://github.com/yaz231/claude-knowledge-graph
cd claude-knowledge-graph
npm install
npm run build
```

Link the binary locally:

```bash
npm link
ckg --version
```

## Testing the Installer Without Touching Real Config

Use the `CKG_CONFIG_DIR` environment variable to redirect all config reads and writes to a temp directory:

```bash
export CKG_CONFIG_DIR=/tmp/ckg-test
node dist/cli.js install
```

The installer will write to `/tmp/ckg-test/` instead of `~/.ckg/`. Hook and settings files still go to `~/.claude/` — create a test Claude config dir if needed.

For the Python scripts, the same variable is respected:

```bash
CKG_CONFIG_DIR=/tmp/ckg-test python3 scripts/init_claude_md.py --path /tmp/test-project --dry-run
```

## Coding Conventions

- TypeScript strict mode — no `any` without a comment explaining why
- All async functions should have proper error handling
- Python hooks must never crash Claude Code — wrap everything in `try/except` and log to `~/.ckg/logs/`
- Deep-merge all JSON config files — never overwrite existing keys
- No comments explaining *what* the code does; only add one when the *why* is non-obvious

## Testing Hooks Manually

To test `post_tool_use.py` without running Claude Code:

```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/tmp/test-project/src/foo.ts"}}' \
  | CKG_CONFIG_DIR=/tmp/ckg-test python3 hooks/post_tool_use.py
```

To test `stop.py`:

```bash
echo '{"stop_hook_active": false}' \
  | CKG_CONFIG_DIR=/tmp/ckg-test python3 hooks/stop.py
```

## Release Process

```bash
npm run build
npm version patch   # or minor/major
npm publish --access public
```
