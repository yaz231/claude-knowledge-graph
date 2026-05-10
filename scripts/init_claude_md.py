#!/usr/bin/env python3
"""
One-time recursive CLAUDE.md crawler.
Walks all directories, generates CLAUDE.md via Anthropic API.

Usage:
    python init_claude_md.py [--path .] [--dry-run] [--ignore-file .ckgignore]
"""

import argparse
import fnmatch
import json
import os
import sys
import traceback
from pathlib import Path


def get_ckg_dir() -> Path:
    return Path(os.environ.get("CKG_CONFIG_DIR", Path.home() / ".ckg"))


def load_config() -> dict:
    config_path = get_ckg_dir() / "config.json"
    if not config_path.exists():
        print(f"[error] CKG config not found at {config_path}. Run `ckg install` first.", file=sys.stderr)
        sys.exit(1)
    with config_path.open() as f:
        return json.load(f)


ALWAYS_SKIP = {
    "node_modules", ".git", "__pycache__", "dist", "build", ".next",
    ".venv", "venv", ".env", ".temp", "worktrees", ".codegraph",
    "site-packages", ".turbo", ".cache", "coverage", ".pytest_cache",
    ".mypy_cache", "*.egg-info", ".tox", "htmlcov",
}

SOURCE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".rb", ".php",
    ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala", ".sh",
    ".yaml", ".yml", ".toml", ".json", ".md", ".sql", ".html", ".css", ".scss",
}

MAX_FILE_BYTES = 100_000
MAX_FILES_PER_DIR = 20  # cap context size


def load_ckgignore(root: Path, ignore_file: str) -> list[str]:
    ignore_path = root / ignore_file
    if not ignore_path.exists():
        return []
    lines = ignore_path.read_text().splitlines()
    return [l.strip() for l in lines if l.strip() and not l.startswith("#")]


def should_skip(name: str, ignore_patterns: list[str]) -> bool:
    if name in ALWAYS_SKIP:
        return True
    return any(fnmatch.fnmatch(name, pat) for pat in ignore_patterns)


def list_source_files(directory: Path) -> list[Path]:
    files = []
    try:
        for entry in directory.iterdir():
            if entry.is_file() and entry.suffix in SOURCE_EXTENSIONS and entry.name != "CLAUDE.md":
                files.append(entry)
    except PermissionError:
        pass
    return sorted(files)[:MAX_FILES_PER_DIR]


def read_file_safe(path: Path) -> str:
    try:
        size = path.stat().st_size
        if size > MAX_FILE_BYTES:
            return f"[File too large: {size} bytes — skipped]"
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"[Could not read: {e}]"


def infer_project_meta(root: Path) -> dict:
    meta: dict = {"name": root.name, "stack": []}
    pkg_json = root / "package.json"
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text())
            meta["name"] = data.get("name", root.name)
            meta["stack"].append("Node.js")
            if "next" in data.get("dependencies", {}):
                meta["stack"].append("Next.js")
            if "react" in data.get("dependencies", {}):
                meta["stack"].append("React")
            if "typescript" in data.get("devDependencies", {}):
                meta["stack"].append("TypeScript")
        except Exception:
            pass
    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        meta["stack"].append("Python")
    go_mod = root / "go.mod"
    if go_mod.exists():
        meta["stack"].append("Go")
    cargo = root / "Cargo.toml"
    if cargo.exists():
        meta["stack"].append("Rust")
    return meta


def generate_claude_md(
    directory: Path,
    source_files: list[Path],
    existing_content: str,
    is_root: bool,
    project_meta: dict,
    client,
    model: str,
    dry_run: bool,
) -> str:
    file_list = "\n".join(f"  - {f.name}" for f in source_files)
    file_contents = ""
    for f in source_files[:8]:
        content = read_file_safe(f)
        file_contents += f"\n### {f.name}\n```\n{content[:2000]}\n```\n"

    root_context = ""
    if is_root:
        root_context = f"""
This is the ROOT directory of the project.
Project name: {project_meta.get('name', 'unknown')}
Tech stack: {', '.join(project_meta.get('stack', [])) or 'unknown'}

The root CLAUDE.md should also include:
- A brief project overview (1-2 sentences)
- Tech stack summary
- Top-level directory map with one-line descriptions
"""

    prompt = f"""You are generating a CLAUDE.md file for a directory in a software project.

Directory: {directory}
Files present:
{file_list}
{root_context}
Existing CLAUDE.md content (preserve relevant parts, update stale info):
{existing_content or "None"}

File contents (sample):
{file_contents}

Generate a CLAUDE.md that includes:
- What this directory contains and its purpose
- Key files and what they do
- Patterns, conventions, or rules Claude should follow when working here
- Any important architectural decisions visible from the code

Be concise. Max 80 lines. Output only the CLAUDE.md content, no preamble."""

    if dry_run:
        return f"# {directory.name}\n\n[DRY RUN — would call {model}]\n"

    response = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text  # type: ignore[index]


def crawl(root: Path, ignore_patterns: list[str], config: dict, dry_run: bool) -> None:
    import anthropic  # type: ignore[import-untyped]

    api_key = config.get("anthropic_api_key", "")
    if not api_key:
        print("[error] No anthropic_api_key in config.", file=sys.stderr)
        sys.exit(1)

    model = config.get("init_model", "claude-sonnet-4-6")
    client = anthropic.Anthropic(api_key=api_key)
    project_meta = infer_project_meta(root)

    dirs_to_process: list[Path] = []

    for dirpath, dirnames, _ in os.walk(root):
        current = Path(dirpath)
        # Prune skip dirs in-place so os.walk doesn't recurse into them
        dirnames[:] = [d for d in dirnames if not should_skip(d, ignore_patterns)]

        source_files = list_source_files(current)
        if source_files or current == root:
            dirs_to_process.append(current)

    total = len(dirs_to_process)
    for i, directory in enumerate(dirs_to_process, 1):
        try:
            source_files = list_source_files(directory)
            if not source_files and directory != root:
                continue

            existing_md = ""
            md_path = directory / "CLAUDE.md"
            if md_path.exists():
                existing_md = md_path.read_text(encoding="utf-8", errors="replace")

            is_root = directory == root
            content = generate_claude_md(
                directory=directory,
                source_files=source_files,
                existing_content=existing_md,
                is_root=is_root,
                project_meta=project_meta,
                client=client,
                model=model,
                dry_run=dry_run,
            )

            if not dry_run:
                md_path.write_text(content, encoding="utf-8")

            rel = directory.relative_to(root) if directory != root else Path(".")
            print(f"  [{i}/{total}] ✓ {rel}")

        except Exception as e:
            print(f"  [{i}/{total}] ✗ {directory}: {e}", file=sys.stderr)
            if os.environ.get("CKG_DEBUG"):
                traceback.print_exc()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate CLAUDE.md files recursively using Anthropic API")
    parser.add_argument("--path", default=".", help="Root directory to crawl (default: .)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without writing files")
    parser.add_argument("--ignore-file", default=".ckgignore", help="Ignore patterns file (default: .ckgignore)")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.is_dir():
        print(f"[error] {root} is not a directory", file=sys.stderr)
        sys.exit(1)

    config = load_config()
    ignore_patterns = load_ckgignore(root, args.ignore_file)

    mode = " (DRY RUN)" if args.dry_run else ""
    print(f"Generating CLAUDE.md files in {root}{mode}…")
    crawl(root, ignore_patterns, config, args.dry_run)
    print("\nDone.")


if __name__ == "__main__":
    main()
