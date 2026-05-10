#!/usr/bin/env python3
"""
Stop hook — appends a session changelog summary to the root CLAUDE.md of each project touched.
"""

import json
import os
import sys
import traceback
from collections import defaultdict
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
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] stop: {msg}\n")


def load_config() -> dict:
    config_path = get_ckg_dir() / "config.json"
    if not config_path.exists():
        return {}
    with config_path.open() as f:
        return json.load(f)


def get_api_key(config: dict) -> str:
    import subprocess, shutil
    # 1. macOS Keychain
    if shutil.which("security"):
        try:
            user = os.environ.get("USER", os.environ.get("USERNAME", ""))
            result = subprocess.run(
                ["security", "find-generic-password", "-a", user, "-s", "claude-knowledge-graph", "-w"],
                capture_output=True, text=True
            )
            key = result.stdout.strip()
            if key:
                return key
        except Exception:
            pass
    # 2. Environment variable
    env_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if env_key:
        return env_key
    # 3. Legacy config fallback
    return config.get("anthropic_api_key", "")


def generate_session_summary(project_root: str, files: list[str], config: dict) -> str:
    import anthropic  # type: ignore[import-untyped]

    api_key = get_api_key(config)
    if not api_key:
        return ""

    model = config.get("hook_model", "claude-haiku-4-5-20251001")
    root_md_path = Path(project_root) / "CLAUDE.md"
    existing_content = ""
    if root_md_path.exists():
        existing_content = root_md_path.read_text(encoding="utf-8", errors="replace")[-3000:]

    file_list = "\n".join(f"  - {f}" for f in files)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    dirs_updated = sorted({str(Path(f).parent) for f in files})
    dirs_list = "\n".join(f"  - {d}" for d in dirs_updated)

    prompt = f"""Generate a brief session summary for a CLAUDE.md changelog.

Project: {project_root}
Files modified this session:
{file_list}

Existing root CLAUDE.md (last 3000 chars):
{existing_content or "None"}

Format:
---
## Session Summary — {timestamp}
### Files Modified
<bullet list>
### What Changed
<2-5 bullets, inferred from filenames>
### CLAUDE.md Files Updated
{dirs_list}
---

Max 20 lines. Output only the markdown block. No preamble."""

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n" + response.content[0].text.strip() + "\n"  # type: ignore[index]


def main() -> None:
    try:
        raw = sys.stdin.read()
        if raw.strip():
            event = json.loads(raw)
            # Prevent hook-triggered-by-hook loop
            if event.get("stop_hook_active"):
                sys.exit(0)

        session_log_path = get_ckg_dir() / "session-log.json"
        if not session_log_path.exists():
            sys.exit(0)

        try:
            events = json.loads(session_log_path.read_text())
        except Exception:
            sys.exit(0)

        if not events:
            sys.exit(0)

        # Group by project root
        by_project: dict[str, list[str]] = defaultdict(list)
        for ev in events:
            root = ev.get("project_root", "")
            file_ = ev.get("file", "")
            if root and file_:
                by_project[root].append(file_)

        config = load_config()

        for project_root, files in by_project.items():
            try:
                summary = generate_session_summary(project_root, files, config)
                if summary:
                    root_md_path = Path(project_root) / "CLAUDE.md"
                    with root_md_path.open("a", encoding="utf-8") as f:
                        f.write(summary)
            except Exception:
                log_error(f"Failed to write summary for {project_root}:\n{traceback.format_exc()}")

        # Clear session log
        session_log_path.write_text(json.dumps([]))

    except Exception:
        log_error(traceback.format_exc())


if __name__ == "__main__":
    main()
