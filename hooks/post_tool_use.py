#!/usr/bin/env python3
"""
PostToolUse hook — updates CLAUDE.md for the affected directory after Write/Edit/MultiEdit.
Also appends an event to ~/.ckg/session-log.json for the Stop hook.
"""

import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path


def get_ckg_dir() -> Path:
    return Path(os.environ.get("CKG_CONFIG_DIR", Path.home() / ".ckg"))


def get_log_path() -> Path:
    return get_ckg_dir() / "logs" / "hook-errors.log"


def log_error(msg: str) -> None:
    log_path = get_log_path()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] post_tool_use: {msg}\n")


def load_config() -> dict:
    config_path = get_ckg_dir() / "config.json"
    if not config_path.exists():
        return {}
    with config_path.open() as f:
        return json.load(f)


SOURCE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".rb", ".php",
    ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala", ".sh",
    ".yaml", ".yml", ".toml", ".json", ".md", ".sql", ".html", ".css", ".scss",
}

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build", ".next",
    "venv", ".env", ".temp", "worktrees", ".codegraph",
}

MAX_FILE_BYTES = 100_000


def list_source_files(directory: Path) -> list[Path]:
    files = []
    try:
        for entry in directory.iterdir():
            if entry.is_file() and entry.suffix in SOURCE_EXTENSIONS and entry.name != "CLAUDE.md":
                files.append(entry)
    except PermissionError:
        pass
    return sorted(files)


def read_file_safe(path: Path) -> str:
    try:
        size = path.stat().st_size
        if size > MAX_FILE_BYTES:
            return f"[File too large: {size} bytes]"
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"[Could not read: {e}]"


def infer_project_root(file_path: Path) -> str:
    """Walk up to find the first directory containing package.json, pyproject.toml, or .git."""
    current = file_path.parent
    markers = {"package.json", "pyproject.toml", ".git", "go.mod", "Cargo.toml"}
    for parent in [current, *current.parents]:
        if any((parent / m).exists() for m in markers):
            return str(parent)
        if parent == parent.parent:
            break
    return str(file_path.parent)


def append_session_event(file_path: str, project_root: str) -> None:
    log_path = get_ckg_dir() / "session-log.json"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    events = []
    if log_path.exists():
        try:
            events = json.loads(log_path.read_text())
        except Exception:
            events = []
    events.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "file": file_path,
        "project_root": project_root,
    })
    log_path.write_text(json.dumps(events, indent=2))


def update_claude_md(directory: Path, modified_file: str, config: dict) -> None:
    import anthropic  # type: ignore[import-untyped]

    api_key = config.get("anthropic_api_key", "")
    if not api_key:
        log_error("No anthropic_api_key in config — skipping CLAUDE.md update")
        return

    model = config.get("hook_model", "claude-haiku-4-5-20251001")
    source_files = list_source_files(directory)
    if not source_files:
        return

    file_list = "\n".join(f"  - {f.name}" for f in source_files)
    file_contents = ""
    for f in source_files[:10]:  # cap at 10 files to keep prompt small
        content = read_file_safe(f)
        file_contents += f"\n### {f.name}\n```\n{content[:3000]}\n```\n"

    existing_md_path = directory / "CLAUDE.md"
    existing_content = ""
    if existing_md_path.exists():
        existing_content = existing_md_path.read_text(encoding="utf-8", errors="replace")

    prompt = f"""You are maintaining a CLAUDE.md file for a directory in a software project.

Directory: {directory}
Files present:
{file_list}

Current CLAUDE.md content:
{existing_content or "None"}

A file was just modified: {modified_file}

File contents (up to 10 files, truncated):
{file_contents}

Update the CLAUDE.md to accurately reflect:
- What this directory contains and its purpose
- Key files and what they do
- Patterns, conventions, or rules Claude should follow when working here
- Any important context about recent changes

Be concise. Max 80 lines. Output only the updated CLAUDE.md content, no preamble."""

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    updated_content = response.content[0].text  # type: ignore[index]
    existing_md_path.write_text(updated_content, encoding="utf-8")


def extract_file_path(event: dict) -> str | None:
    """Extract the modified file path from the hook event JSON."""
    # tool_use input may contain file_path, path, or similar
    tool_input = event.get("tool_input", {}) or {}
    for key in ("file_path", "path", "new_path"):
        val = tool_input.get(key)
        if val and isinstance(val, str):
            return val

    # MultiEdit: edits is a list of {file_path: ...}
    edits = tool_input.get("edits", [])
    if edits and isinstance(edits, list):
        val = edits[0].get("file_path") or edits[0].get("path")
        if val:
            return val

    return None


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return

        event = json.loads(raw)
        file_path_str = extract_file_path(event)
        if not file_path_str:
            return

        file_path = Path(file_path_str).resolve()
        directory = file_path.parent
        project_root = infer_project_root(file_path)

        append_session_event(str(file_path), project_root)

        config = load_config()
        update_claude_md(directory, file_path.name, config)

    except Exception:
        log_error(traceback.format_exc())


if __name__ == "__main__":
    main()
